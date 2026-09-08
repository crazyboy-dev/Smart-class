import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { status, exam_type } = req.query;
      let q = supabase.from('exams').select('*').order('exam_date', { ascending: true });
      if (status) q = q.eq('status', String(status));
      if (exam_type) q = q.eq('exam_type', String(exam_type));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { exam_code, subject, exam_type, exam_date, start_time, end_time, status } = req.body || {};
      if (!exam_code || !subject || !exam_date) return res.status(400).json({ error: 'Exam code, subject and date required' });
      const code = String(exam_code).trim().toUpperCase();
      const { data: dup } = await supabase.from('exams').select('id').eq('exam_code', code).limit(1);
      if (dup && dup.length) return res.status(400).json({ error: 'Exam code must be unique: ' + code });
      const { data, error } = await supabase.from('exams').insert({ exam_code: code, subject: String(subject).trim(), exam_type: exam_type || 'CIA 1', exam_date: String(exam_date), start_time: start_time || null, end_time: end_time || null, status: status || 'Scheduled' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, exam_code, subject, exam_type, exam_date, start_time, end_time, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (exam_code !== undefined) {
        const code = String(exam_code).trim().toUpperCase();
        const { data: dup } = await supabase.from('exams').select('id').eq('exam_code', code).limit(5);
        if (dup && dup.some(d => d.id !== Number(id))) return res.status(400).json({ error: 'Exam code must be unique' });
        patch.exam_code = code;
      }
      if (subject !== undefined) patch.subject = String(subject).trim();
      if (exam_type !== undefined) patch.exam_type = exam_type;
      if (exam_date !== undefined) patch.exam_date = exam_date;
      if (start_time !== undefined) patch.start_time = start_time || null;
      if (end_time !== undefined) patch.end_time = end_time || null;
      if (status !== undefined) patch.status = status;
      const { data, error } = await supabase.from('exams').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await supabase.from('exam_students').delete().eq('exam_id', Number(id));
      const { error } = await supabase.from('exams').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('exams error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
