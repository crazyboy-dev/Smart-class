import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    if (req.method === 'GET') {
      const { search, department, admission_year, limit } = req.query;
      let q = supabase.from('students').select('*').order('roll_number', { ascending: true });
      if (department) q = q.eq('department', String(department));
      if (admission_year) q = q.eq('admission_year', String(admission_year));
      q = q.limit(limit ? Number(limit) : 2000);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data || [];
      if (search) { const s = String(search).toLowerCase(); rows = rows.filter(r => (r.roll_number||'').toLowerCase().includes(s) || (r.name||'').toLowerCase().includes(s)); }
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.bulk && Array.isArray(body.rows)) {
        const rows = body.rows.map(r => ({ roll_number: String(r.roll_number).trim().toUpperCase(), name: String(r.name || '').trim() || String(r.roll_number).trim().toUpperCase(), department: r.department ? String(r.department).trim().toUpperCase() : null, admission_year: r.admission_year ? String(r.admission_year).trim() : null }));
        for (const r of rows) if (!r.roll_number) return res.status(400).json({ error: 'Every row needs a roll number' });
        const seen = new Set();
        for (const r of rows) { if (seen.has(r.roll_number)) return res.status(400).json({ error: 'Duplicate roll number in import: ' + r.roll_number }); seen.add(r.roll_number); }
        const { data: existing } = await supabase.from('students').select('roll_number').in('roll_number', rows.map(r => r.roll_number));
        if (existing && existing.length) return res.status(400).json({ error: 'Duplicate roll numbers already exist: ' + existing.map(e => e.roll_number).slice(0, 5).join(', ') });
        const { data, error } = await supabase.from('students').insert(rows).select();
        if (error) throw error;
        return res.status(201).json(data);
      }
      if (body.generate) {
        const { admission_year, department, start, end, name_prefix } = body;
        if (!admission_year || !department || start === undefined || end === undefined) return res.status(400).json({ error: 'Admission year, department, start and end required' });
        const s = Number(start), e = Number(end);
        if (isNaN(s) || isNaN(e) || s < 0 || e < s || (e - s) > 500) return res.status(400).json({ error: 'Invalid range (max 500 at a time)' });
        const dept = String(department).trim().toUpperCase();
        const yr = String(admission_year).trim();
        const rows = [];
        for (let n = s; n <= e; n++) {
          const num = String(n).padStart(3, '0');
          rows.push({ roll_number: yr + dept + num, name: (name_prefix ? String(name_prefix).trim() + ' ' : 'Student ') + yr + dept + num, department: dept, admission_year: yr });
        }
        const { data: existing } = await supabase.from('students').select('roll_number').in('roll_number', rows.map(r => r.roll_number));
        if (existing && existing.length) return res.status(400).json({ error: 'These roll numbers already exist: ' + existing.map(x => x.roll_number).slice(0, 8).join(', ') });
        const { data, error } = await supabase.from('students').insert(rows).select();
        if (error) throw error;
        return res.status(201).json(data);
      }
      const { roll_number, name, department, admission_year } = body;
      if (!roll_number) return res.status(400).json({ error: 'Roll number required' });
      const rn = String(roll_number).trim().toUpperCase();
      const { data: dup } = await supabase.from('students').select('id').eq('roll_number', rn).limit(1);
      if (dup && dup.length) return res.status(400).json({ error: 'Duplicate roll number: ' + rn });
      const { data, error } = await supabase.from('students').insert({ roll_number: rn, name: name ? String(name).trim() : rn, department: department ? String(department).trim().toUpperCase() : null, admission_year: admission_year ? String(admission_year).trim() : null }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, roll_number, name, department, admission_year } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      if (roll_number !== undefined) {
        const rn = String(roll_number).trim().toUpperCase();
        const { data: dup } = await supabase.from('students').select('id').eq('roll_number', rn).limit(5);
        if (dup && dup.some(d => d.id !== Number(id))) return res.status(400).json({ error: 'Duplicate roll number: ' + rn });
        patch.roll_number = rn;
      }
      if (name !== undefined) patch.name = String(name).trim();
      if (department !== undefined) patch.department = department ? String(department).trim().toUpperCase() : null;
      if (admission_year !== undefined) patch.admission_year = admission_year ? String(admission_year).trim() : null;
      const { data, error } = await supabase.from('students').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const b = req.body || {};
      const qq = req.query || {};
      const id = b.id ?? qq.id;
      const deleteAll = b.delete_all ?? qq.delete_all;
      const scopeDept = b.department ?? qq.department ?? null;
      if (deleteAll === true || deleteAll === 'true' || deleteAll === 1 || deleteAll === '1') {
        // Bulk wipe: cascade in dependency order (seating -> exam links -> students),
        // optionally scoped to one department. Never touches other tables' master data.
        if (scopeDept) {
          const dept = String(scopeDept).trim().toUpperCase();
          const { data: doomed } = await supabase.from('students').select('id,roll_number').eq('department', dept);
          const ids = (doomed || []).map(s => s.id).filter(Boolean);
          const rolls = (doomed || []).map(s => s.roll_number).filter(Boolean);
          for (let i = 0; i < ids.length; i += 500) {
            await supabase.from('seating').delete().in('student_id', ids.slice(i, i + 500));
            await supabase.from('exam_students').delete().in('student_id', ids.slice(i, i + 500));
          }
          for (let i = 0; i < rolls.length; i += 500) {
            await supabase.from('seating').delete().in('roll_number', rolls.slice(i, i + 500));
            await supabase.from('exam_students').delete().in('roll_number', rolls.slice(i, i + 500));
          }
          const { error } = await supabase.from('students').delete().eq('department', dept);
          if (error) throw error;
          await supabase.from('allotments').update({ total_students: 0, total_rooms: 0 }).gte('id', 0);
          return res.status(200).json({ ok: true, deleted_department: dept, count: (doomed || []).length });
        }
        await supabase.from('seating').delete().gte('id', 0);
        await supabase.from('exam_students').delete().gte('id', 0);
        const { error } = await supabase.from('students').delete().gte('id', 0);
        if (error) throw error;
        await supabase.from('allotments').update({ total_students: 0, total_rooms: 0 }).gte('id', 0);
        return res.status(200).json({ ok: true, deleted_all: true });
      }
      if (!id) return res.status(400).json({ error: 'id required' });
      const { data: victim } = await supabase.from('students').select('id,roll_number').eq('id', Number(id)).limit(1);
      if (victim && victim.length) {
        await supabase.from('seating').delete().eq('student_id', Number(id));
        await supabase.from('seating').delete().eq('roll_number', victim[0].roll_number);
        await supabase.from('exam_students').delete().eq('student_id', Number(id));
        await supabase.from('exam_students').delete().eq('roll_number', victim[0].roll_number);
      }
      const { error } = await supabase.from('students').delete().eq('id', Number(id));
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('students error:', err);
    return res.status(500).json({ error: 'Operation failed: ' + err.message });
  }
}
