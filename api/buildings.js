import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { search } = req.query;
      const { data, error } = await supabase.from('buildings').select('*').order('id', { ascending: true });
      if (error) throw error;
      let rows = data || [];
      if (search) { const s = String(search).toLowerCase(); rows = rows.filter(r => (r.name||'').toLowerCase().includes(s) || (r.code||'').toLowerCase().includes(s)); }
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { name, code, status } = req.body || {};
      if (!name || !code) return res.status(400).json({ error: 'Building name and code required' });
      const { data, error } = await supabase.from('buildings').insert({ name: String(name).trim(), code: String(code).trim().toUpperCase(), status: status || 'Active' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, name, code, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (name !== undefined) patch.name = String(name).trim();
      if (code !== undefined) patch.code = String(code).trim().toUpperCase();
      if (status !== undefined) patch.status = status;
      const { data, error } = await supabase.from('buildings').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('buildings').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('buildings error:', err);
    return res.status(500).json({ error: String(err.message||'').includes('duplicate') ? 'Building code already exists' : 'Operation failed: ' + err.message });
  }
}
