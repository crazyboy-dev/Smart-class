import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../lib/api';
import { Card, PageHead } from '../components/Layout';
import { Building2, Layers, DoorOpen, Users, GraduationCap, ClipboardList, UserCheck, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    try {
      const [dash, ex] = await Promise.all([get('/api/dashboard'), get('/api/exams')]);
      setD(dash); setExams(ex);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  if (loading) return <div className="text-blue-700">Loading dashboard...</div>;
  const cards = [
    { label: 'Buildings', v: d?.buildings, icon: Building2, to: '/buildings' },
    { label: 'Floors', v: d?.floors, icon: Layers, to: '/floors' },
    { label: 'Rooms', v: d?.rooms, icon: DoorOpen, to: '/rooms' },
    { label: 'Available Rooms', v: d?.availableRooms, icon: CheckCircle2, to: '/rooms' },
    { label: 'Staff', v: d?.staff, icon: UserCheck, to: '/staff' },
    { label: 'Available Staff', v: d?.availableStaff, icon: Users, to: '/staff' },
    { label: 'Students', v: d?.students, icon: GraduationCap, to: '/students' },
    { label: 'Departments', v: d?.departments, icon: Users, to: '/departments' },
    { label: 'Exams', v: d?.exams, icon: ClipboardList, to: '/exams' },
    { label: 'Upcoming Exams', v: d?.upcomingExams, icon: ClipboardList, to: '/exams' },
    { label: 'Total Capacity', v: d?.totalCapacity, icon: DoorOpen, to: '/rooms' },
    { label: 'Unallotted Students', v: d?.unallottedStudents, icon: AlertTriangle, to: '/allotments' },
  ];
  const quick = [
    { to: '/buildings', l: 'Add Building' }, { to: '/floors', l: 'Add Floor' }, { to: '/rooms', l: 'Add Room' },
    { to: '/students', l: 'Add Student' }, { to: '/staff', l: 'Add Staff' }, { to: '/exams', l: 'Create Exam' }, { to: '/create-allotment', l: 'Generate Allotment' },
  ];
  return (
    <div>
      <PageHead title="Dashboard" sub="Examination cell overview & allotment status" />
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {cards.map((c, i) => (
          <Link key={i} to={c.to}>
            <Card className="p-4 hover:shadow-md transition hover:border-blue-300">
              <c.icon className="text-blue-600 mb-2" size={22} />
              <div className="text-2xl font-bold text-blue-900">{c.v ?? 0}</div>
              <div className="text-xs text-slate-500">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-bold text-blue-900 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {quick.map(q => <Link key={q.l} to={q.to} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg"><Plus size={14} />{q.l}</Link>)}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-blue-900 mb-3">Upcoming Exams</h3>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {(exams || []).slice(0, 6).map(e => (
              <div key={e.id} className="flex justify-between text-sm border-b pb-2">
                <span><b>{e.exam_code}</b> • {e.subject}<br /><span className="text-slate-500 text-xs">{e.exam_date} {e.start_time || ''}-{e.end_time || ''} • {e.exam_type}</span></span>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full h-fit">{e.status}</span>
              </div>
            ))}
            {!exams?.length && <p className="text-sm text-slate-400">No exams yet.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-blue-900 mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-56 overflow-y-auto text-sm">
            {(d?.recentActivity || []).map((h: any) => (
              <div key={h.id} className="border-b pb-2"><span className="font-semibold text-blue-700">{h.action}</span> <span className="text-slate-500">• {h.details}</span><br /><span className="text-xs text-slate-400">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</span></div>
            ))}
            {!(d?.recentActivity || []).length && <p className="text-slate-400">No activity yet. Generate an allotment to begin.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
