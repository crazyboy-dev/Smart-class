import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const { q, exam_id, building_id, floor_id, room_id, department, staff_id, exam_type, date, status } = req.query;
    const hasFilter = q || exam_id || building_id || floor_id || room_id || department || staff_id || exam_type || date || status;
    if (!hasFilter) {
      const { data: recent } = await supabase.from('seating').select('*').order('id', { ascending: false }).limit(100);
      return res.status(200).json(recent || []);
    }
    let seatQ = supabase.from('seating').select('*').limit(5000);
    if (room_id) seatQ = seatQ.eq('room_id', Number(room_id));
    let { data: seating } = await seatQ;
    seating = seating || [];
    let allotMap = {}, examMap = {}, roomMap = {}, bMap = {}, fMap = {}, studMap = {};
    const aIds = [...new Set(seating.map(s => s.allotment_id))];
    const eIds = [...new Set(seating.map(s => s.exam_id))];
    const rIds = [...new Set(seating.map(s => s.room_id))];
    if (aIds.length) { const { data } = await supabase.from('allotments').select('*').in('id', aIds); (data || []).forEach(a => { allotMap[a.id] = a; }); }
    if (eIds.length) {
      let eq = supabase.from('exams').select('*').in('id', eIds);
      if (exam_id) eq = eq.eq('id', Number(exam_id));
      if (exam_type) eq = eq.eq('exam_type', String(exam_type));
      if (date) eq = eq.eq('exam_date', String(date));
      if (status) eq = eq.eq('status', String(status));
      const { data } = await eq;
      (data || []).forEach(e => { examMap[e.id] = e; });
      seating = seating.filter(s => examMap[s.exam_id]);
    }
    if (rIds.length) { const { data } = await supabase.from('rooms').select('*').in('id', rIds); (data || []).forEach(r => { roomMap[r.id] = r; }); }
    if (building_id) seating = seating.filter(s => (roomMap[s.room_id] || {}).building_id === Number(building_id));
    if (floor_id) seating = seating.filter(s => (roomMap[s.room_id] || {}).floor_id === Number(floor_id));
    const bb = [...new Set(Object.values(roomMap).map(r => r.building_id).filter(Boolean))];
    const ff = [...new Set(Object.values(roomMap).map(r => r.floor_id).filter(Boolean))];
    if (bb.length) { const { data } = await supabase.from('buildings').select('*').in('id', bb); (data || []).forEach(b => { bMap[b.id] = b; }); }
    if (ff.length) { const { data } = await supabase.from('floors').select('*').in('id', ff); (data || []).forEach(f => { fMap[f.id] = f; }); }
    const sIds = [...new Set(seating.map(s => s.student_id).filter(Boolean))];
    for (let i = 0; i < sIds.length; i += 500) {
      const { data } = await supabase.from('students').select('*').in('id', sIds.slice(i, i + 500));
      (data || []).forEach(s => { studMap[s.id] = s; });
    }
    if (department) seating = seating.filter(s => (studMap[s.student_id] || {}).department === String(department).toUpperCase());
    if (staff_id) {
      const { data: assigns } = await supabase.from('staff_assignments').select('*').eq('staff_id', Number(staff_id));
      const allowedRooms = new Set((assigns || []).map(a => a.room_id + '|' + a.allotment_id));
      seating = seating.filter(s => allowedRooms.has(s.room_id + '|' + s.allotment_id));
    }
    if (q) {
      const s = String(q).toLowerCase();
      seating = seating.filter(x => {
        const room = roomMap[x.room_id] || {}; const ex = examMap[x.exam_id] || {}; const st = studMap[x.student_id] || {};
        return (x.roll_number || '').toLowerCase().includes(s) || (room.room_number || '').toLowerCase().includes(s) || (ex.exam_code || '').toLowerCase().includes(s) || (ex.subject || '').toLowerCase().includes(s) || (st.name || '').toLowerCase().includes(s);
      });
    }
    const out = seating.slice(0, 1000).map(s => {
      const room = roomMap[s.room_id] || {}; const ex = examMap[s.exam_id] || {}; const st = studMap[s.student_id] || {};
      return { ...s, exam_code: ex.exam_code || '', subject: ex.subject || '', exam_date: ex.exam_date || '', start_time: ex.start_time, end_time: ex.end_time, exam_type: ex.exam_type, room_number: room.room_number || '', capacity: room.capacity, building_name: (bMap[room.building_id] || {}).name || '', floor_number: (fMap[room.floor_id] || {}).floor_number || '', student_name: st.name || '', department: st.department || '' };
    });
    return res.status(200).json(out);
  } catch (err) {
    console.error('search error:', err);
    return res.status(500).json({ error: 'Search failed: ' + err.message });
  }
}
