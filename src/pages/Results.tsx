import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../lib/api';
import { Card, PageHead } from '../components/Layout';
import { inputCls } from '../components/Crud';

export default function Results() {
  const [sp] = useSearchParams();
  const [allots, setAllots] = useState<any[]>([]);
  const [aid, setAid] = useState(sp.get('allotment') || '');
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('complete');
  const [roll, setRoll] = useState('');
  const [found, setFound] = useState<any[]>([]);
  useEffect(() => { get('/api/allotments').then(a => { setAllots(a); if (!aid && a.length) setAid(String(a[0].id)); }).catch(() => {}); }, []);
  useEffect(() => { if (aid) get('/api/seating?allotment_id=' + aid).then(setData).catch(() => {}); }, [aid]);
  const ex = data?.exam || {};
  const searchRoll = () => {
    if (!roll) return;
    setFound((data?.seating || []).filter((s: any) => s.roll_number.toLowerCase().includes(roll.trim().toLowerCase())));
    setTab('student');
  };
  const roomGroups: any = {};
  (data?.seating || []).forEach((s: any) => { (roomGroups[s.room_id] = roomGroups[s.room_id] || []).push(s); });
  const tabs = [['complete', 'Complete Allotment'], ['hall', 'Hall Notice'], ['room', 'Room Wise'], ['student', 'Student Wise'], ['staff', 'Staff Duty']];
  return (
    <div>
      <PageHead title="Result Views" sub="Complete • Room-wise • Student-wise • Staff duty" />
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-sm font-semibold">Allotment</label><select value={aid} onChange={e => setAid(e.target.value)} className={inputCls + ' min-w-[240px]'}>{allots.map(a => <option key={a.id} value={a.id}>#{a.id} {a.exam?.exam_code} ({a.status})</option>)}</select></div>
          <div className="flex gap-2"><input value={roll} onChange={e => setRoll(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchRoll()} placeholder="Search roll number..." className={inputCls} /><button onClick={searchRoll} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Find</button></div>
          <div className="text-sm text-slate-500 ml-auto">{ex.exam_code} • {ex.subject} • {ex.exam_date} {ex.start_time || ''}-{ex.end_time || ''}</div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>)}</div>
      </Card>
      {tab === 'complete' && (
        <Card className="p-4"><div className="overflow-x-auto max-h-[520px] overflow-y-auto"><table className="w-full text-sm">
          <thead className="sticky top-0 bg-blue-50"><tr>{['Exam', 'Subject', 'Date/Time', 'Building', 'Floor', 'Room', 'Roll', 'Dept', 'Seat'].map(h => <th key={h} className="text-left px-2 py-2">{h}</th>)}</tr></thead>
          <tbody>{(data?.seating || []).map((s: any) => <tr key={s.id} className="border-t"><td className="px-2 py-1.5">{ex.exam_code}</td><td className="px-2 py-1.5">{ex.subject}</td><td className="px-2 py-1.5">{ex.exam_date} {ex.start_time}</td><td className="px-2 py-1.5">{s.building_name}</td><td className="px-2 py-1.5">{s.floor_number}</td><td className="px-2 py-1.5">{s.room_number}</td><td className="px-2 py-1.5 font-semibold">{s.roll_number}</td><td className="px-2 py-1.5">{s.department}</td><td className="px-2 py-1.5 font-mono">{s.seat_no}</td></tr>)}
          </tbody></table></div></Card>
      )}
      {tab === 'room' && (
        <div className="grid md:grid-cols-2 gap-3">{Object.keys(roomGroups).map(rid => {
          const g = roomGroups[rid];
          const st = (data?.staff || []).find((x: any) => String(x.room_id) === String(rid));
          return (
            <Card key={rid} className="p-4">
              <div className="font-bold text-blue-900">{g[0]?.building_name} • {g[0]?.floor_number} • Room {g[0]?.room_number}</div>
              <div className="text-sm text-slate-500 mb-2">Capacity {g[0]?.capacity} • Seated {g.length} • Duty: <b>{st?.staff_name || 'Unassigned'}</b> ({st?.duty_status || '—'})</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs max-h-48 overflow-y-auto">{g.sort((a: any, b: any) => a.seat_no.localeCompare(b.seat_no)).map((s: any) => <div key={s.id} className="border rounded px-2 py-1"><span className="font-mono font-bold">{s.seat_no}</span> {s.roll_number}</div>)}</div>
            </Card>);
        })}</div>
      )}
      {tab === 'student' && (
        <Card className="p-4">
          {!found.length && <p className="text-sm text-slate-400">Enter a roll number above and press Find (e.g. 24BCS076).</p>}
          {found.map((s: any) => (
            <div key={s.id} className="border rounded-xl p-4 mb-2 bg-blue-50/50">
              <div className="font-bold text-lg text-blue-900">{s.roll_number} — {s.student_name}</div>
              <div className="text-sm grid sm:grid-cols-2 gap-1 mt-2">
                <span>Department: <b>{s.department}</b></span><span>Exam: <b>{ex.exam_code} • {ex.subject}</b></span>
                <span>Building: <b>{s.building_name}</b></span><span>Floor: <b>{s.floor_number}</b></span>
                <span>Room: <b>{s.room_number}</b></span><span>Seat: <b className="font-mono">{s.seat_no}</b></span>
              </div>
            </div>))}
        </Card>
      )}
      {tab === 'hall' && (
        <Card className="p-4">
          <div className="text-center border-b-2 border-blue-900 pb-3 mb-3">
            <div className="font-extrabold text-blue-900">OFFICE OF THE CONTROLLER OF EXAMINATIONS</div>
            <div className="text-sm font-semibold">HALL SEATING FOR THE END SEMESTER EXAMINATIONS</div>
            <div className="text-sm">DATE OF EXAMINATION: <b>{ex.exam_date}</b> &nbsp; SESSION: <b>{ex.start_time}-{ex.end_time}</b></div>
            <div className="text-sm font-bold">[{ex.exam_code}] {ex.subject}</div>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-blue-50"><th className="text-left px-2 py-2">Programme</th><th className="text-left px-2 py-2">List of students registered</th><th className="text-left px-2 py-2">Hall Number</th></tr></thead>
            <tbody>{Object.keys(roomGroups).map(rid => {
              const g = [...roomGroups[rid]].sort((a: any, b: any) => a.roll_number.localeCompare(b.roll_number));
              return <tr key={rid} className="border-t align-top"><td className="px-2 py-2">{g[0]?.department}</td><td className="px-2 py-2 text-xs leading-relaxed">{g.map((s: any) => s.roll_number).join(', ')} <b>({g.length})</b></td><td className="px-2 py-2 font-bold">{g[0]?.room_number}</td></tr>;
            })}
            {!Object.keys(roomGroups).length && <tr><td colSpan={3} className="text-center py-6 text-slate-400">No allotment generated yet.</td></tr>}</tbody></table></div>
        </Card>
      )}
      {tab === 'staff' && (
        <Card className="p-4"><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="bg-blue-50">{['Staff', 'Exam', 'Building', 'Floor', 'Room', 'Duty Status'].map(h => <th key={h} className="text-left px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>{(data?.staff || []).map((s: any) => <tr key={s.id} className="border-t"><td className="px-3 py-2 font-semibold">{s.staff_name || '—'}</td><td className="px-3 py-2">{ex.exam_code}</td><td className="px-3 py-2">{s.building_name}</td><td className="px-3 py-2">{s.floor_number}</td><td className="px-3 py-2">{s.room_number}</td><td className="px-3 py-2">{s.duty_status}</td></tr>)}</tbody>
        </table></div></Card>
      )}
    </div>
  );
}
