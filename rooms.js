import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { building_id, floor_id, status } = req.query;
      let q = supabase.from('rooms').select('*').order('id', { ascending: true });
      if (building_id) q = q.eq('building_id', Number(building_id));
      if (floor_id) q = q.eq('floor_id', Number(floor_id));
      if (status) q = q.eq('status', String(status));
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }
    if (req.method === 'POST') {
      const { building_id, floor_id, room_number, capacity, status } = req.body || {};
      if (!building_id || !floor_id || !room_number) return res.status(400).json({ error: 'Building, floor and room number required' });
      const cap = (capacity === undefined || capacity === '') ? 45 : Number(capacity);
      if (isNaN(cap) || cap < 1) return res.status(400).json({ error: 'Capacity must be a positive number' });
      const { data, error } = await supabase.from('rooms').insert({ building_id: Number(building_id), floor_id: Number(floor_id), room_number: String(room_number).trim(), capacity: cap, status: status || 'Available' }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, building_id, floor_id, room_number, capacity, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (building_id !== undefined) patch.building_id = Number(building_id);
      if (floor_id !== undefined) patch.floor_id = Number(floor_id);
      if (room_number !== undefined) patch.room_number = String(room_number).trim();
      if (capacity !== undefined) { const cap = Number(capacity); if (isNaN(cap) || cap < 1) return res.status(400).json({ error: 'Capacity must be positive' }); patch.capacity = cap; }
      if (status !== undefined) patch.status = status;
      const { data, error } = await supabase.from('rooms').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || req.query || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('rooms').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('rooms error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
