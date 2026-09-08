import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { exam_id, status } = req.query;
      let q = supabase.from('allotments').select('*').order('id', { ascending: false });
      if (exam_id) q = q.eq('exam_id', Number(exam_id));
      if (status) q = q.eq('status', String(status));
      const { data, error } = await q;
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) return res.status(200).json([]);
      const examIds = [...new Set(rows.map(r => r.exam_id))];
      const { data: exams } = await supabase.from('exams').select('*').in('id', examIds);
      const emap = Object.fromEntries((exams || []).map(e => [e.id, e]));
      return res.status(200).json(rows.map(r => ({ ...r, exam: emap[r.exam_id] || null })));
    }
    if (req.method === 'POST') {
      const { exam_id, seat_format } = req.body || {};
      if (!exam_id) return res.status(400).json({ error: 'exam_id required' });
      const { data: ex } = await supabase.from('allotments').select('id').eq('exam_id', Number(exam_id)).eq('status', 'DRAFT').limit(1);
      const { data: a, error } = await supabase.from('allotments').insert({ exam_id: Number(exam_id), status: 'DRAFT', seat_format: seat_format || 'A01', total_students: 0, total_rooms: 0 }).select().single();
      if (error) throw error;
      await supabase.from('allotment_history').insert({ allotment_id: a.id, exam_id: Number(exam_id), action: 'CREATED', details: 'Allotment draft created' });
      return res.status(201).json(a);
    }
    if (req.method === 'PUT') {
      const { id, status, seat_format, total_students, total_rooms } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (status !== undefined) patch.status = status;
      if (seat_format !== undefined) patch.seat_format = seat_format;
      if (total_students !== undefined) patch.total_students = total_students;
      if (total_rooms !== undefined) patch.total_rooms = total_rooms;
      const { data, error } = await supabase.from('allotments').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const aid = Number(id);
      await supabase.from('seating').delete().eq('allotment_id', aid);
      await supabase.from('staff_assignments').delete().eq('allotment_id', aid);
      await supabase.from('allotment_history').delete().eq('allotment_id', aid);
      const { error } = await supabase.from('allotments').delete().eq('id', aid);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('allotments error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
