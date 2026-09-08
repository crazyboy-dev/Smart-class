import supabase from './db-client.js';
function seatLabel(i, fmt) {
  if (fmt === 'NUM') return String(i + 1);
  const n = String((i % 45) + 1).padStart(2, '0');
  const row = String.fromCharCode(65 + Math.floor(i / 45) % 26);
  return row + n;
}
function interleave(students) {
  const groups = {};
  for (const s of students) { const k = s.department || 'GEN'; (groups[k] = groups[k] || []).push(s); }
  const keys = Object.keys(groups).sort();
  groups && keys.forEach(k => groups[k].sort((a, b) => String(a.roll_number).localeCompare(String(b.roll_number))));
  const out = [];
  let idx = 0, added = true;
  while (added) { added = false; for (const k of keys) { if (groups[k][idx] !== undefined) { out.push(groups[k][idx]); added = true; } } idx++; }
  return out;
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { exam_id, room_ids, seat_format, allotment_id } = req.body || {};
    if (!exam_id) return res.status(400).json({ error: 'exam_id required' });
    if (!room_ids || !room_ids.length) return res.status(400).json({ error: 'Select at least one room' });
    const { data: sel } = await supabase.from('exam_students').select('*').eq('exam_id', Number(exam_id)).order('roll_number', { ascending: true });
    let students = sel || [];
    // Inline student selection: if the exam has no pre-linked students yet,
    // accept the selection inline (dept(s) / year / range / rolls / ids) and persist it.
    const { student_ids, roll_numbers, department, departments, admission_year, range_start, range_end } = req.body || {};
    const inlineDeptList = [...(Array.isArray(departments) ? departments : []), ...(department ? [department] : [])]
      .map(d => String(d).trim().toUpperCase()).filter(Boolean);
    if (!students.length && (student_ids?.length || roll_numbers?.length || inlineDeptList.length || admission_year || (range_start && range_end))) {
      let toAdd = [];
      if (student_ids && Array.isArray(student_ids) && student_ids.length) {
        const { data: studs, error } = await supabase.from('students').select('*').in('id', student_ids.map(Number));
        if (error) throw error;
        toAdd = (studs || []).map(s => ({ exam_id: Number(exam_id), student_id: s.id, roll_number: s.roll_number }));
      } else if (roll_numbers && Array.isArray(roll_numbers) && roll_numbers.length) {
        const clean = [...new Set(roll_numbers.map(r => String(r).trim().toUpperCase()).filter(Boolean))];
        const { data: studs, error } = await supabase.from('students').select('*').in('roll_number', clean);
        if (error) throw error;
        const found = new Set((studs || []).map(s => s.roll_number));
        const missing = clean.filter(r => !found.has(r));
        if (missing.length) return res.status(400).json({ error: 'Roll numbers not found: ' + missing.slice(0, 10).join(', ') });
        toAdd = (studs || []).map(s => ({ exam_id: Number(exam_id), student_id: s.id, roll_number: s.roll_number }));
      } else {
        let q = supabase.from('students').select('*').limit(5000);
        if (inlineDeptList.length === 1) q = q.eq('department', inlineDeptList[0]);
        else if (inlineDeptList.length > 1) q = q.in('department', inlineDeptList);
        if (admission_year) q = q.eq('admission_year', String(admission_year));
        const { data: studs, error } = await q;
        if (error) throw error;
        let list = studs || [];
        if (range_start && range_end) {
          const a = String(range_start).trim().toUpperCase(), b = String(range_end).trim().toUpperCase();
          list = list.filter(s => s.roll_number >= a && s.roll_number <= b);
        }
        if (!list.length) return res.status(400).json({ error: 'No students match the inline selection' });
        toAdd = list.map(s => ({ exam_id: Number(exam_id), student_id: s.id, roll_number: s.roll_number }));
      }
      const { error: insErr } = await supabase.from('exam_students').insert(toAdd);
      if (insErr) throw insErr;
      students = toAdd.map(t => ({ ...t }));
      students.sort((a, b) => String(a.roll_number).localeCompare(String(b.roll_number)));
    }
    if (!students.length) return res.status(400).json({ error: 'No students selected for this exam. Pick students on this page (department / year / range) or add them under Exam Student Selection first.' });
    const { data: roomsRaw } = await supabase.from('rooms').select('*').in('id', room_ids.map(Number));
    const rooms = (roomsRaw || []).filter(r => r.status === 'Available');
    const skipped = (roomsRaw || []).filter(r => r.status !== 'Available');
    if (skipped.length) return res.status(400).json({ error: 'These rooms are not Available and cannot be used: ' + skipped.map(r => r.room_number).join(', ') });
    if (!rooms.length) return res.status(400).json({ error: 'No available rooms selected' });
    rooms.sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
    const totalCap = rooms.reduce((a, r) => a + (Number(r.capacity) || 0), 0);
    if (totalCap < students.length) return res.status(400).json({ error: `Insufficient room capacity: ${students.length} students but only ${totalCap} seats in ${rooms.length} room(s). Add more rooms or increase capacity.`, totalStudents: students.length, totalCapacity: totalCap });
    let fmt = seat_format || 'A01';
    if (!allotment_id) {
      const { data: st } = await supabase.from('settings').select('seat_format').limit(1);
      if (!seat_format && st && st[0] && st[0].seat_format) fmt = st[0].seat_format;
    }
    // allotment row
    let allot = null;
    if (allotment_id) {
      const { data } = await supabase.from('allotments').select('*').eq('id', Number(allotment_id)).single();
      allot = data;
      if (!allot) return res.status(404).json({ error: 'Allotment not found' });
      if (allot.status === 'FINALIZED') return res.status(400).json({ error: 'Allotment is finalized. Reopen it before regenerating.' });
    } else {
      const { data: drafts } = await supabase.from('allotments').select('*').eq('exam_id', Number(exam_id)).eq('status', 'DRAFT').limit(1);
      if (drafts && drafts.length) allot = drafts[0];
      else {
        const { data, error } = await supabase.from('allotments').insert({ exam_id: Number(exam_id), status: 'DRAFT', seat_format: fmt }).select().single();
        if (error) throw error;
        allot = data;
      }
    }
    await supabase.from('allotments').update({ seat_format: fmt }).eq('id', allot.id);
    await supabase.from('seating').delete().eq('allotment_id', allot.id);
    await supabase.from('staff_assignments').delete().eq('allotment_id', allot.id);
    // student info map for department mixing
    const sids = students.map(s => s.student_id).filter(Boolean);
    let deptMap = {};
    if (sids.length) {
      for (let i = 0; i < sids.length; i += 500) {
        const { data: studs } = await supabase.from('students').select('id,department').in('id', sids.slice(i, i + 500));
        (studs || []).forEach(s => { deptMap[s.id] = s.department; });
      }
    }
    const enriched = students.map(s => ({ ...s, department: deptMap[s.student_id] || null }));
    const ordered = interleave(enriched);
    const seatRows = [];
    let si = 0;
    const usedRooms = [];
    for (const room of rooms) {
      if (si >= ordered.length) break;
      const capN = Number(room.capacity) || 0;
      usedRooms.push(room);
      for (let k = 0; k < capN && si < ordered.length; k++, si++) {
        const st = ordered[si];
        seatRows.push({ allotment_id: allot.id, exam_id: Number(exam_id), student_id: st.student_id, roll_number: st.roll_number, room_id: room.id, seat_no: seatLabel(k, fmt) });
      }
    }
    if (si < ordered.length) return res.status(400).json({ error: `Could not fit all students: ${ordered.length - si} left unallotted. This should never happen silently — add more capacity.` });
    // chunk insert
    for (let i = 0; i < seatRows.length; i += 500) {
      const { error } = await supabase.from('seating').insert(seatRows.slice(i, i + 500));
      if (error) throw error;
    }
    // staff assignment: one available staff per used room
    const { data: availStaff } = await supabase.from('staff').select('*').eq('availability', 'Available').order('id', { ascending: true });
    const pool = availStaff || [];
    const assignRows = usedRooms.map((room, i) => {
      const stf = pool[i] || null;
      return { allotment_id: allot.id, exam_id: Number(exam_id), staff_id: stf ? stf.id : null, staff_name: stf ? stf.name : null, room_id: room.id, duty_status: stf ? 'Assigned' : 'Unassigned' };
    });
    for (let i = 0; i < assignRows.length; i += 200) {
      const { error } = await supabase.from('staff_assignments').insert(assignRows.slice(i, i + 200));
      if (error) throw error;
    }
    const staffShort = Math.max(0, usedRooms.length - pool.length);
    await supabase.from('allotments').update({ total_students: students.length, total_rooms: usedRooms.length }).eq('id', allot.id);
    await supabase.from('allotment_history').insert({ allotment_id: allot.id, exam_id: Number(exam_id), action: 'GENERATED', details: `Auto-allotted ${students.length} students to ${usedRooms.length} rooms (${seatRows.length} seats, format ${fmt})${staffShort ? `; STAFF SHORTAGE: need ${usedRooms.length}, have ${pool.length}` : ''}` });
    return res.status(200).json({ ok: true, allotment_id: allot.id, totalStudents: students.length, totalCapacity: totalCap, roomsUsed: usedRooms.length, staffShortage: staffShort, warning: staffShort ? `Only ${pool.length} staff available for ${usedRooms.length} rooms. Add ${staffShort} more available staff before finalizing.` : null });
  } catch (err) {
    console.error('generate error:', err);
    return res.status(500).json({ error: 'Generation failed: ' + err.message });
  }
}
