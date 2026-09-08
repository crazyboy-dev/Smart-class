import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const allotment_id = req.query.allotment_id || (req.body || {}).allotment_id;
    if (!allotment_id) return res.status(400).json({ error: 'allotment_id required' });
    const aid = Number(allotment_id);
    const [{ data: allot }, { data: seating }, { data: staffA }, { data: sel }] = await Promise.all([
      supabase.from('allotments').select('*').eq('id', aid).single(),
      supabase.from('seating').select('*').eq('allotment_id', aid).limit(5000),
      supabase.from('staff_assignments').select('*').eq('allotment_id', aid),
      supabase.from('allotments').select('exam_id').eq('id', aid).single(),
    ]);
    if (!allot) return res.status(404).json({ error: 'Allotment not found' });
    const { data: examStudents } = await supabase.from('exam_students').select('*').eq('exam_id', allot.exam_id).limit(5000);
    const roomIds = [...new Set([...(seating || []).map(s => s.room_id), ...(staffA || []).map(s => s.room_id)].filter(Boolean))];
    let roomMap = {};
    if (roomIds.length) { const { data: rooms } = await supabase.from('rooms').select('*').in('id', roomIds); roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r])); }
    let staffMap = {};
    {
      const { data: allStaff } = await supabase.from('staff').select('*');
      staffMap = Object.fromEntries((allStaff || []).map(s => [s.id, s]));
    }
    const issues = [];
    const crit = [];
    // duplicate roll
    const rollCount = {};
    (seating || []).forEach(s => { rollCount[s.roll_number] = (rollCount[s.roll_number] || 0) + 1; });
    Object.entries(rollCount).forEach(([rn, c]) => { if (c > 1) { crit.push(`Duplicate roll number seated ${c}x: ${rn}`); issues.push({ level: 'critical', message: `Duplicate roll number: ${rn} appears ${c} times` }); } });
    // duplicate seat in same room
    const seatKey = {};
    (seating || []).forEach(s => { const k = s.room_id + '|' + String(s.seat_no).toLowerCase(); seatKey[k] = (seatKey[k] || 0) + 1; });
    Object.entries(seatKey).forEach(([k, c]) => { if (c > 1) { crit.push(`Duplicate seat ${k.split('|')[1]} in room ${k.split('|')[0]} (${c}x)`); issues.push({ level: 'critical', message: `Duplicate seat ${k.split('|')[1]} in same room (${c}x)` }); } });
    // capacity + unavailable rooms
    const perRoom = {};
    (seating || []).forEach(s => { perRoom[s.room_id] = (perRoom[s.room_id] || 0) + 1; });
    Object.entries(perRoom).forEach(([rid, c]) => {
      const room = roomMap[Number(rid)] || {};
      if ((Number(room.capacity) || 0) < c) { crit.push(`Room ${room.room_number || rid} capacity exceeded: ${c}/${room.capacity}`); issues.push({ level: 'critical', message: `Room ${room.room_number || rid}: ${c} students exceed capacity ${room.capacity}` }); }
      if (room.status && room.status !== 'Available') { crit.push(`Room ${room.room_number || rid} is ${room.status} (must be Available)`); issues.push({ level: 'critical', message: `Room ${room.room_number || rid} is ${room.status}` }); }
    });
    // students without room/seat
    (examStudents || []).forEach(es => {
      const found = (seating || []).find(s => s.roll_number === es.roll_number);
      if (!found) { crit.push(`Student without room: ${es.roll_number}`); issues.push({ level: 'critical', message: `Student without room: ${es.roll_number}` }); }
      else if (!found.seat_no) { crit.push(`Student without seat: ${es.roll_number}`); issues.push({ level: 'critical', message: `Student without seat: ${es.roll_number}` }); }
    });
    (seating || []).forEach(s => { if (!s.room_id) { crit.push(`Seat row without room: ${s.roll_number}`); issues.push({ level: 'critical', message: `Seat row without room: ${s.roll_number}` }); } });
    // staff checks
    const roomsUsed = [...new Set((seating || []).map(s => s.room_id).filter(Boolean))];
    roomsUsed.forEach(rid => {
      const a = (staffA || []).find(x => x.room_id === rid);
      const room = roomMap[rid] || {};
      if (!a || !a.staff_id) { crit.push(`Staff without room assignment: room ${room.room_number || rid} has no invigilator`); issues.push({ level: 'critical', message: `Room ${room.room_number || rid} has no invigilator assigned` }); }
      else {
        const st = staffMap[a.staff_id];
        if (st && st.availability !== 'Available') { crit.push(`Unavailable staff assigned: ${st.name} (${st.availability})`); issues.push({ level: 'critical', message: `Staff ${st.name} is ${st.availability}` }); }
      }
    });
    const staffCount = {};
    (staffA || []).forEach(a => { if (a.staff_id) staffCount[a.staff_id] = (staffCount[a.staff_id] || 0) + 1; });
    Object.entries(staffCount).forEach(([sid, c]) => { if (c > 1) { const st = staffMap[Number(sid)]; crit.push(`Staff assigned to multiple rooms: ${st ? st.name : sid} (${c} rooms in same session)`); issues.push({ level: 'critical', message: `Staff ${st ? st.name : sid} assigned to ${c} rooms (one staff = one room per session)` }); } });
    if (roomsUsed.length > 0 && (staffA || []).filter(a => a.staff_id).length < roomsUsed.length) {
      issues.push({ level: 'warning', message: `Insufficient staff: ${roomsUsed.length} rooms need invigilators, only ${(staffA || []).filter(a => a.staff_id).length} assigned` });
    }
    const totalSel = (examStudents || []).length;
    const totalSeat = (seating || []).length;
    if (totalSeat < totalSel) issues.push({ level: 'warning', message: `${totalSel - totalSeat} selected student(s) still unallotted` });
    const valid = crit.length === 0;
    return res.status(200).json({ valid, status: valid ? 'ALLOTMENT VALID' : 'ISSUES FOUND', critical: crit, issues, stats: { selected: totalSel, seated: totalSeat, roomsUsed: roomsUsed.length, staffAssigned: (staffA || []).filter(a => a.staff_id).length } });
  } catch (err) {
    console.error('validate error:', err);
    return res.status(500).json({ error: 'Validation failed: ' + err.message });
  }
}
