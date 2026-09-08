import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { Card, PageHead } from '../components/Layout';
import { inputCls } from '../components/Crud';

export default function Search() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ exam_id: '', building_id: '', department: '', exam_type: '', date: '', status: '' });
  const [exams, setExams] = useState<any[]>([]); const [buildings, setBuildings] = useState<any[]>([]); const [depts, setDepts] = useState<any[]>([]);
  useEffect(() => {
    get('/api/exams').then(setExams).catch(() => {});
    get('/api/buildings').then(setBuildings).catch(() => {});
    get('/api/departments').then(setDepts).catch(() => {});
    run({});
  }, []);
  const run = async (over: any = {}) => {
    setBusy(true);
    try {
      const p = new URLSearchParams();
      const all = { q, ...f, ...over };
      Object.entries(all).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
      setRows(await get('/api/search?' + p.toString()));
    } catch {} finally { setBusy(false); }
  };
  return (
    <div>
      <PageHead title="Search / Filter" sub="Search by roll, room, staff, building, exam code, subject" />
      <Card className="p-4 mb-4">
        <div className="flex gap-2 mb-3">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} placeholder="Type to search..." className={inputCls} />
          <button onClick={() => run()} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold">Search</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <select value={f.exam_id} onChange={e => setF({ ...f, exam_id: e.target.value })} className={inputCls}><option value="">Exam</option>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_code}</option>)}</select>
          <select value={f.exam_type} onChange={e => setF({ ...f, exam_type: e.target.value })} className={inputCls}><option value="">Type</option><option>CIA 1</option><option>CIA 2</option><option>Model Exam</option><option>Other</option></select>
          <input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} className={inputCls} />
          <select value={f.building_id} onChange={e => setF({ ...f, building_id: e.target.value })} className={inputCls}><option value="">Building</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select value={f.department} onChange={e => setF({ ...f, department: e.target.value })} className={inputCls}><option value="">Dept</option>{depts.map(d => <option key={d.id} value={d.dept_code}>{d.dept_code}</option>)}</select>
          <select value={f.status} onChange={e => setF({ ...f, status: e.target.value })} className={inputCls}><option value="">Status</option><option>Scheduled</option><option>Ongoing</option><option>Completed</option><option>Cancelled</option></select>
        </div>
        <button onClick={() => run()} className="mt-2 text-sm bg-slate-100 px-4 py-2 rounded-lg font-semibold">Apply Filters</button>
      </Card>
      <Card className="p-4">
        {busy ? <p className="text-blue-700">Searching...</p> :
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto"><table className="w-full text-sm">
            <thead className="sticky top-0 bg-blue-50"><tr>{['Exam', 'Roll', 'Student', 'Dept', 'Building', 'Room', 'Seat', 'Date'].map(h => <th key={h} className="text-left px-2 py-2">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r: any) => <tr key={r.id} className="border-t"><td className="px-2 py-1.5">{r.exam_code}</td><td className="px-2 py-1.5 font-semibold">{r.roll_number}</td><td className="px-2 py-1.5">{r.student_name}</td><td className="px-2 py-1.5">{r.department}</td><td className="px-2 py-1.5">{r.building_name}</td><td className="px-2 py-1.5">{r.room_number}</td><td className="px-2 py-1.5">{r.seat_no}</td><td className="px-2 py-1.5">{r.exam_date}</td></tr>)}
              {!rows.length && <tr><td colSpan={8} className="text-center py-6 text-slate-400">No results.</td></tr>}</tbody></table></div>}
      </Card>
    </div>
  );
}
