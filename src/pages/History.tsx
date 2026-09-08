import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { Card, PageHead } from '../components/Layout';
import { inputCls } from '../components/Crud';

export default function History() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [examId, setExamId] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => { get('/api/exams').then(setExams).catch(() => {}); load(''); }, []);
  const load = async (eid: string) => {
    setLoading(true);
    try { setRows(await get('/api/allotment-finalize' + (eid ? '?exam_id=' + eid : ''))); } catch {}
    finally { setLoading(false); }
  };
  return (
    <div>
      <PageHead title="Finalization History" sub="Every create / generate / save / finalize / reopen event" />
      <Card className="p-4">
        <select value={examId} onChange={e => { setExamId(e.target.value); load(e.target.value); }} className={inputCls + ' max-w-sm mb-3'}><option value="">All Exams</option>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_code}</option>)}</select>
        {loading ? <p className="text-blue-700">Loading...</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-blue-50 text-blue-900"><th className="text-left px-3 py-2">Time</th><th className="text-left px-3 py-2">Allotment</th><th className="text-left px-3 py-2">Action</th><th className="text-left px-3 py-2">Details</th></tr></thead>
            <tbody>{rows.map((h: any) => <tr key={h.id} className="border-t"><td className="px-3 py-2">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</td><td className="px-3 py-2">#{h.allotment_id}</td><td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{h.action}</span></td><td className="px-3 py-2">{h.details}</td></tr>)}
              {!rows.length && <tr><td colSpan={4} className="text-center py-6 text-slate-400">No history yet.</td></tr>}</tbody></table></div>}
      </Card>
    </div>
  );
}
