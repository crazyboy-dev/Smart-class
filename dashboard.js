import supabase from './db-client.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const [b, f, r, st, s, dep, ex, al, sea, sas] = await Promise.all([
      supabase.from('buildings').select('id,status'),
      supabase.from('floors').select('id'),
      supabase.from('rooms').select('id,status,capacity'),
      supabase.from('staff').select('id,availability'),
      supabase.from('students').select('id'),
      supabase.from('departments').select('id'),
      supabase.from('exams').select('id,exam_date,status'),
      supabase.from('allotments').select('id,exam_id,status'),
      supabase.from('seating').select('id'),
      supabase.from('exam_students').select('id,exam_id,roll_number'),
    ]);
    const rooms = r.data || [];
    const staff = st.data || [];
    const exams = ex.data || [];
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = exams.filter(e => (e.exam_date || '') >= today).length;
    const examIds = new Set((al.data || []).map(a => a.exam_id));
    let unallotted = 0;
    const { data: seatRows } = sea;
    const seatedRolls = new Set();
    // count exam_students without seating per exam that has allotment? simpler: total exam_students - seating rows
    const totalSelections = (sas.data || []).length;
    const totalSeated = (seatRows || []).length;
    unallotted = Math.max(0, totalSelections - totalSeated);
    // required rooms estimate: for latest draft/finalized? compute per upcoming exam without allotment
    const { data: availRooms } = await supabase.from('rooms').select('capacity').eq('status', 'Available');
    const cap = (availRooms || []).reduce((a, x) => a + (Number(x.capacity) || 0), 0);
    const { data: hist } = await supabase.from('allotment_history').select('*').order('id', { ascending: false }).limit(8);
    return res.status(200).json({
      buildings: (b.data || []).length,
      floors: (f.data || []).length,
      rooms: rooms.length,
      availableRooms: rooms.filter(x => x.status === 'Available').length,
      staff: staff.length,
      availableStaff: staff.filter(x => x.availability === 'Available').length,
      students: (s.data || []).length,
      departments: (dep.data || []).length,
      exams: exams.length,
      upcomingExams: upcoming,
      totalCapacity: cap,
      unallottedStudents: unallotted,
      allotments: (al.data || []).length,
      recentActivity: hist || [],
    });
  } catch (err) {
    console.error('dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard' });
  }
}
