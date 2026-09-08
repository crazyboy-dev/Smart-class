import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { exam_id } = req.query;
      let q = supabase.from('exam_students').select('*').order('roll_number', { ascending: true }).limit(5000);
      if (exam_id) q = q.eq('exam_id', Number(exam_id));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { exam_id, student_ids, roll_numbers, department, departments, admission_year, range_start, range_end } = req.body || {};
      if (!exam_id) return res.status(400).json({ error: 'exam_id required' });
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
      } else if (department || departments || admission_year || (range_start && range_end)) {
        const deptList = [...(departments && Array.isArray(departments) ? departments : []), ...(department ? [department] : [])]
          .map(d => String(d).trim().toUpperCase()).filter(Boolean);
        let q = supabase.from('students').select('*').limit(5000);
        if (deptList.length === 1) q = q.eq('department', deptList[0]);
        else if (deptList.length > 1) q = q.in('department', deptList);
        if (admission_year) q = q.eq('admission_year', String(admission_year));
        const { data: studs, error } = await q;
        if (error) throw error;
        let list = studs || [];
        if (range_start && range_end) {
          const a = String(range_start).trim().toUpperCase(), b = String(range_end).trim().toUpperCase();
          list = list.filter(s => s.roll_number >= a && s.roll_number <= b);
        }
        if (!list.length) return res.status(400).json({ error: 'No students match the selection' });
        toAdd = list.map(s => ({ exam_id: Number(exam_id), student_id: s.id, roll_number: s.roll_number }));
      } else return res.status(400).json({ error: 'Provide students to add' });
      const { data: existing } = await supabase.from('exam_students').select('roll_number').eq('exam_id', Number(exam_id));
      const have = new Set((existing || []).map(e => e.roll_number));
      toAdd = toAdd.filter(t => !have.has(t.roll_number));
      if (!toAdd.length) return res.status(400).json({ error: 'All selected students are already added to this exam' });
      const { data, error } = await supabase.from('exam_students').insert(toAdd).select();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'DELETE') {
      const b = req.body || {};
      const qq = req.query || {};
      const id = b.id || qq.id;
      const exam_id = b.exam_id || qq.exam_id;
      const clear = b.clear || qq.clear;
      if ((clear === true || clear === 'true' || clear === 1 || clear === '1') && exam_id) {
        const { error } = await supabase.from('exam_students').delete().eq('exam_id', Number(exam_id));
        if (error) throw error;
        return res.status(200).json({ ok: true });
      }
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('exam_students').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('exam-students error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
