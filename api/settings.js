import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('settings').select('*').limit(1).single();
      if (error && !String(error.message||'').includes('No rows')) throw error;
      return res.status(200).json(data || { college_name: 'Smart College', college_code: 'SC', academic_year: '2026-27', default_capacity: 45, exam_duration: 180, seat_format: 'A01', report_header: '' });
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const b = req.body || {};
      const patch = {};
      if (b.college_name !== undefined) patch.college_name = String(b.college_name);
      if (b.college_code !== undefined) patch.college_code = String(b.college_code);
      if (b.academic_year !== undefined) patch.academic_year = String(b.academic_year);
      if (b.default_capacity !== undefined) patch.default_capacity = Number(b.default_capacity) || 45;
      if (b.exam_duration !== undefined) patch.exam_duration = Number(b.exam_duration) || 180;
      if (b.seat_format !== undefined) patch.seat_format = String(b.seat_format);
      if (b.report_header !== undefined) patch.report_header = String(b.report_header);
      const { data: cur } = await supabase.from('settings').select('id').limit(1);
      let out;
      if (cur && cur.length) {
        const { data, error } = await supabase.from('settings').update(patch).eq('id', cur[0].id).select().single();
        if (error) throw error; out = data;
      } else {
        const { data, error } = await supabase.from('settings').insert({ college_name: 'Smart College', ...patch }).select().single();
        if (error) throw error; out = data;
      }
      return res.status(200).json(out);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('settings error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
