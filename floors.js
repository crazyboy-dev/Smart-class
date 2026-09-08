import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { building_id } = req.query;
      let q = supabase.from('floors').select('*').order('id', { ascending: true });
      if (building_id) q = q.eq('building_id', Number(building_id));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { building_id, floor_number, status } = req.body || {};
      if (!building_id || !floor_number) return res.status(400).json({ error: 'Building and floor number required' });
      const { data, error } = await supabase.from('floors').insert({ building_id: Number(building_id), floor_number: String(floor_number).trim(), status: status || 'Active' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, building_id, floor_number, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (building_id !== undefined) patch.building_id = Number(building_id);
      if (floor_number !== undefined) patch.floor_number = String(floor_number).trim();
      if (status !== undefined) patch.status = status;
      const { data, error } = await supabase.from('floors').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('floors').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('floors error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
