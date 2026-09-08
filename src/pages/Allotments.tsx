import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';

export default function Allotments() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<any>(null);
  const load = async () => {
    setLoading(true);
    try { setRows(await get('/api/allotments')); } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const remove = async (id: number) => {
    if (!window.confirm('Delete this allotment and all its seating?')) return;
    try { await del('/api/allotments', { id }); setMsg({ type: 'ok', text: 'Allotment deleted' }); load(); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  return (
    <div>
      <PageHead title="Allotments" sub="Drafts & finalized allotments per exam" right={<Link to="/create-allotment" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">+ New Allotment</Link>} />
      <Msg msg={msg} />
      <Card className="p-4">
        {loading ? <p className="text-blue-700">Loading...</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-blue-50 text-blue-900"><th className="text-left px-3 py-2">ID</th><th className="text-left px-3 py-2">Exam</th><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Students</th><th className="text-left px-3 py-2">Rooms</th><th className="text-left px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>{rows.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2">#{r.id}</td><td className="px-3 py-2 font-semibold">{r.exam?.exam_code}</td><td className="px-3 py-2">{r.exam?.subject}</td>
                <td className="px-3 py-2">{r.exam?.exam_date}</td><td className="px-3 py-2">{r.total_students ?? '—'}</td><td className="px-3 py-2">{r.total_rooms ?? '—'}</td>
                <td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${r.status === 'FINALIZED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{r.status}</span></td>
                <td className="px-3 py-2 whitespace-nowrap"><Link to={`/allotment/${r.id}`} className="text-blue-700 text-xs font-semibold bg-blue-50 px-2 py-1 rounded">Open</Link> <button onClick={() => remove(r.id)} className="text-red-600 text-xs font-semibold px-1">Delete</button></td>
              </tr>))}
              {!rows.length && <tr><td colSpan={8} className="text-center py-6 text-slate-400">No allotments yet. Create one from an exam.</td></tr>}
            </tbody></table></div>}
      </Card>
    </div>
  );
}
