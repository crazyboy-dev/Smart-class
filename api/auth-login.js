import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const { data, error } = await supabase.from('admins').select('*').eq('username', String(username).trim()).limit(1);
    if (error) throw error;
    const admin = data && data[0];
    if (!admin) return res.status(401).json({ error: 'Invalid username or password' });
    const stored = String(admin.password || '');
    const { createHash } = await import('crypto');
    const sha = createHash('sha256').update(String(password)).digest('hex');
    const ok = stored === String(password) || stored === sha || stored === ('sha256$' + sha) || stored === ('sha256:' + sha);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });
    const safe = { id: admin.id, username: admin.username, name: admin.name || admin.username };
    return res.status(200).json({ ok: true, admin: safe });
  } catch (err) {
    console.error('auth-login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
}
