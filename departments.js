import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('departments').select('*').order('dept_code', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { dept_code, dept_name, status } = req.body || {};
      if (!dept_code || !dept_name) return res.status(400).json({ error: 'Dept code and name required' });
      const { data, error } = await supabase.from('departments').insert({ dept_code: String(dept_code).trim().toUpperCase(), dept_name: String(dept_name).trim(), status: status || 'Active' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, dept_code, dept_name, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (dept_code !== undefined) patch.dept_code = String(dept_code).trim().toUpperCase();
      if (dept_name !== undefined) patch.dept_name = String(dept_name).trim();
      if (status !== undefined) patch.status = status;
      const { data, error } = await supabase.from('departments').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('departments').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('departments error:', err);
    return res.status(500).json({ error: String(err.message||'').includes('duplicate') ? 'Department code already exists' : 'Operation failed: ' + err.message });
  }
}
