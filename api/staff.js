import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { availability, search } = req.query;
      let q = supabase.from('staff').select('*').order('id', { ascending: true });
      if (availability) q = q.eq('availability', String(availability));
      const { data, error } = await q;
      if (error) throw error;
      let rows = data || [];
      if (search) { const s = String(search).toLowerCase(); rows = rows.filter(r => (r.name||'').toLowerCase().includes(s) || String(r.department||'').toLowerCase().includes(s)); }
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const { name, department, availability } = req.body || {};
      if (!name) return res.status(400).json({ error: 'Staff name required' });
      const { data, error } = await supabase.from('staff').insert({ name: String(name).trim(), department: department ? String(department).trim() : null, availability: availability || 'Available' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, name, department, availability } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (name !== undefined) patch.name = String(name).trim();
      if (department !== undefined) patch.department = department ? String(department).trim() : null;
      if (availability !== undefined) patch.availability = availability;
      const { data, error } = await supabase.from('staff').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('staff').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('staff error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
