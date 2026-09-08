import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { allotment_id, exam_id } = req.query;
      if (!allotment_id && !exam_id) return res.status(400).json({ error: 'allotment_id or exam_id required' });
      let aid = allotment_id ? Number(allotment_id) : null;
      if (!aid) {
        const { data: al } = await supabase.from('allotments').select('*').eq('exam_id', Number(exam_id)).order('id', { ascending: false }).limit(1);
        if (!al || !al.length) return res.status(200).json({ allotment: null, seating: [], staff: [] });
        aid = al[0].id;
      }
      const [{ data: allot }, { data: seating }, { data: staffA }] = await Promise.all([
        supabase.from('allotments').select('*').eq('id', aid).single(),
        supabase.from('seating').select('*').eq('allotment_id', aid).order('room_id', { ascending: true }).limit(5000),
        supabase.from('staff_assignments').select('*').eq('allotment_id', aid),
      ]);
      const roomIds = [...new Set([...(seating || []).map(s => s.room_id), ...(staffA || []).map(s => s.room_id)].filter(Boolean))];
      let roomMap = {};
      if (roomIds.length) {
        const { data: rooms } = await supabase.from('rooms').select('*').in('id', roomIds);
        roomMap = Object.fromEntries((rooms || []).map(r => [r.id, r]));
      }
      const bIds = [...new Set(Object.values(roomMap).map(r => r.building_id).filter(Boolean))];
      const fIds = [...new Set(Object.values(roomMap).map(r => r.floor_id).filter(Boolean))];
      let bMap = {}, fMap = {};
      if (bIds.length) { const { data } = await supabase.from('buildings').select('*').in('id', bIds); bMap = Object.fromEntries((data || []).map(b => [b.id, b])); }
      if (fIds.length) { const { data } = await supabase.from('floors').select('*').in('id', fIds); fMap = Object.fromEntries((data || []).map(f => [f.id, f])); }
      const { data: exam } = allot ? await supabase.from('exams').select('*').eq('id', allot.exam_id).single() : { data: null };
      const studIds = [...new Set((seating || []).map(s => s.student_id).filter(Boolean))];
      let studMap = {};
      if (studIds.length) {
        const chunks = [];
        for (let i = 0; i < studIds.length; i += 500) chunks.push(studIds.slice(i, i + 500));
        for (const c of chunks) {
          const { data } = await supabase.from('students').select('*').in('id', c);
          (data || []).forEach(s => { studMap[s.id] = s; });
        }
      }
      const enrich = (s) => {
        const room = roomMap[s.room_id] || {};
        return { ...s, room_number: room.room_number || ('Room#' + s.room_id), capacity: room.capacity, room_status: room.status, building_id: room.building_id, floor_id: room.floor_id, building_name: (bMap[room.building_id] || {}).name || '', building_code: (bMap[room.building_id] || {}).code || '', floor_number: (fMap[room.floor_id] || {}).floor_number || '', student_name: (studMap[s.student_id] || {}).name || '', department: (studMap[s.student_id] || {}).department || '' };
      };
      return res.status(200).json({ allotment: allot, exam: exam || null, seating: (seating || []).map(enrich), staff: (staffA || []).map(a => { const room = roomMap[a.room_id] || {}; return { ...a, room_number: room.room_number || '', building_name: (bMap[room.building_id] || {}).name || '', floor_number: (fMap[room.floor_id] || {}).floor_number || '' }; }), buildings: Object.values(bMap), floors: Object.values(fMap), rooms: Object.values(roomMap) });
    }
    if (req.method === 'PUT') {
      const { id, room_id, seat_no, roll_number } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (room_id !== undefined) patch.room_id = Number(room_id);
      if (seat_no !== undefined) patch.seat_no = String(seat_no).trim();
      if (roll_number !== undefined) patch.roll_number = String(roll_number).trim().toUpperCase();
      const { data, error } = await supabase.from('seating').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { action, allotment_id, staff_id, room_id } = req.body || {};
      if (action === 'set-staff') {
        if (!allotment_id || !room_id) return res.status(400).json({ error: 'allotment_id and room_id required' });
        let staff_name = null;
        if (staff_id) {
          const { data: st } = await supabase.from('staff').select('*').eq('id', Number(staff_id)).single();
          if (!st) return res.status(404).json({ error: 'Staff not found' });
          staff_name = st.name;
        }
        const { data: ex } = await supabase.from('staff_assignments').select('*').eq('allotment_id', Number(allotment_id)).eq('room_id', Number(room_id)).limit(1);
        if (ex && ex.length) {
          const { data, error } = await supabase.from('staff_assignments').update({ staff_id: staff_id ? Number(staff_id) : null, staff_name, duty_status: staff_id ? 'Assigned' : 'Unassigned' }).eq('id', ex[0].id).select().single();
          if (error) throw error;
          return res.status(200).json(data);
        }
        const { data: allot } = await supabase.from('allotments').select('exam_id').eq('id', Number(allotment_id)).single();
        const { data, error } = await supabase.from('staff_assignments').insert({ allotment_id: Number(allotment_id), exam_id: allot.exam_id, staff_id: staff_id ? Number(staff_id) : null, staff_name, room_id: Number(room_id), duty_status: staff_id ? 'Assigned' : 'Unassigned' }).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (action === 'move-student') {
        const { seating_id, new_room_id, new_seat } = req.body || {};
        if (!seating_id) return res.status(400).json({ error: 'seating_id required' });
        const patch = {};
        if (new_room_id) patch.room_id = Number(new_room_id);
        if (new_seat) patch.seat_no = String(new_seat).trim();
        const { data, error } = await supabase.from('seating').update(patch).eq('id', Number(seating_id)).select().single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (action === 'remove-student') {
        const { seating_id } = req.body || {};
        if (!seating_id) return res.status(400).json({ error: 'seating_id required' });
        const { error } = await supabase.from('seating').delete().eq('id', Number(seating_id));
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (action === 'add-student') {
        const { roll_number, new_room_id, new_seat } = req.body || {};
        if (!allotment_id || !roll_number || !new_room_id || !new_seat) return res.status(400).json({ error: 'allotment, roll number, room and seat required' });
        const { data: allot } = await supabase.from('allotments').select('*').eq('id', Number(allotment_id)).single();
        const { data: stud } = await supabase.from('students').select('*').eq('roll_number', String(roll_number).trim().toUpperCase()).limit(1);
        if (!stud || !stud.length) return res.status(404).json({ error: 'Student not found: ' + roll_number });
        const { data, error } = await supabase.from('seating').insert({ allotment_id: Number(allotment_id), exam_id: allot.exam_id, student_id: stud[0].id, roll_number: stud[0].roll_number, room_id: Number(new_room_id), seat_no: String(new_seat).trim() }).select().single();
        if (error) throw error;
        return res.status(201).json(data);
      }
      return res.status(400).json({ error: 'Unknown action' });
    }
    if (req.method === 'DELETE') {
      const { seating_id } = req.body || req.query || {};
      if (!seating_id) return res.status(400).json({ error: 'seating_id required' });
      const { error } = await supabase.from('seating').delete().eq('id', Number(seating_id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('seating error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
