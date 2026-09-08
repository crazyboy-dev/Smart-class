import supabase from './db-client.js';
async function runValidation(aid) {
  const [{ data: allot }, { data: seating }, { data: staffA }] = await Promise.all([
    supabase.from('allotments').select('*').eq('id', aid).single(),
    supabase.from('seating').select('*').eq('allotment_id', aid).limit(5000),
    supabase.from('staff_assignments').select('*').eq('allotment_id', aid),
  ]);
  const { data: examStudents } = await supabase.from('exam_students').select('*').eq('exam_id', allot.exam_id).limit(5000);
  const roomIds = [...new Set([...(seating || []).map(s => s.room_id), ...(staffA || []).map(s => s.room_id)].filter(Boolean))];
  let roomMap = {};
  if (roomIds.length) { const { data: rooms } = await supabase.from('rooms').select('*').in('id', roomIds); roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r])); }
  const { data: allStaff } = await supabase.from('staff').select('*');
  const staffMap = Object.fromEntries((allStaff || []).map(s => [s.id, s]));
  const crit = [];
  const rollCount = {};
  (seating || []).forEach(s => { rollCount[s.roll_number] = (rollCount[s.roll_number] || 0) + 1; });
  Object.values(rollCount).forEach(c => { if (c > 1) crit.push('duplicate roll'); });
  const seatKey = {};
  (seating || []).forEach(s => { const k = s.room_id + '|' + String(s.seat_no).toLowerCase(); seatKey[k] = (seatKey[k] || 0) + 1; });
  Object.values(seatKey).forEach(c => { if (c > 1) crit.push('duplicate seat'); });
  const perRoom = {};
  (seating || []).forEach(s => { perRoom[s.room_id] = (perRoom[s.room_id] || 0) + 1; });
  Object.entries(perRoom).forEach(([rid, c]) => { const room = roomMap[Number(rid)] || {}; if ((Number(room.capacity) || 0) < c) crit.push('capacity'); if (room.status && room.status !== 'Available') crit.push('room status'); });
  (examStudents || []).forEach(es => { if (!(seating || []).find(s => s.roll_number === es.roll_number)) crit.push('unallotted:' + es.roll_number); });
  const roomsUsed = [...new Set((seating || []).map(s => s.room_id).filter(Boolean))];
  roomsUsed.forEach(rid => { const a = (staffA || []).find(x => x.room_id === rid); if (!a || !a.staff_id) crit.push('no staff:' + rid); else { const st = staffMap[a.staff_id]; if (st && st.availability !== 'Available') crit.push('staff unavailable'); } });
  const sc = {};
  (staffA || []).forEach(a => { if (a.staff_id) sc[a.staff_id] = (sc[a.staff_id] || 0) + 1; });
  Object.values(sc).forEach(c => { if (c > 1) crit.push('staff double'); });
  return { crit, allot, seating: seating || [], staffA: staffA || [], examStudents: examStudents || [], roomsUsed };
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { exam_id } = req.query;
      let q = supabase.from('allotment_history').select('*').order('id', { ascending: false }).limit(100);
      if (exam_id) q = q.eq('exam_id', Number(exam_id));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    const { action, allotment_id } = req.body || {};
    if (!action || !allotment_id) return res.status(400).json({ error: 'action and allotment_id required' });
    const aid = Number(allotment_id);
    if (action === 'finalize') {
      const { crit, allot, seating, roomsUsed } = await runValidation(aid);
      if (crit.length) return res.status(400).json({ error: 'Cannot finalize: ' + crit.length + ' critical issue(s). Run validation to see details.', issues: crit.slice(0, 20) });
      await supabase.from('allotments').update({ status: 'FINALIZED', total_students: seating.length, total_rooms: roomsUsed.length }).eq('id', aid);
      await supabase.from('allotment_history').insert({ allotment_id: aid, exam_id: allot.exam_id, action: 'FINALIZED', details: `Finalized with ${seating.length} students in ${roomsUsed.length} rooms` });
      return res.status(200).json({ ok: true, message: 'Allotment finalized' });
    }
    if (action === 'reopen') {
      const { data: allot } = await supabase.from('allotments').select('*').eq('id', aid).single();
      if (!allot) return res.status(404).json({ error: 'Allotment not found' });
      await supabase.from('allotments').update({ status: 'DRAFT' }).eq('id', aid);
      await supabase.from('allotment_history').insert({ allotment_id: aid, exam_id: allot.exam_id, action: 'REOPENED', details: 'Finalized allotment reopened for editing' });
      return res.status(200).json({ ok: true, message: 'Allotment reopened as draft' });
    }
    if (action === 'save-draft') {
      const { data: allot } = await supabase.from('allotments').select('*').eq('id', aid).single();
      await supabase.from('allotment_history').insert({ allotment_id: aid, exam_id: allot.exam_id, action: 'SAVED', details: 'Draft saved by admin' });
      return res.status(200).json({ ok: true, message: 'Draft saved' });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('finalize error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
