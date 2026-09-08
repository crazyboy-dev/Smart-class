import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { get, post } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { inputCls, btnPrimary } from '../components/Crud';

export default function CreateAllotment() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [examId, setExamId] = useState(sp.get('exam') || '');
  const [selCount, setSelCount] = useState(0);
  const [roomSel, setRoomSel] = useState<Set<number>>(new Set());
  const [seatFmt, setSeatFmt] = useState('A01');
  const [filterB, setFilterB] = useState('');
  const [msg, setMsg] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  // Inline student selection (Step 1) — works even when exam_students is empty.
  // Multi-department: tick one or more departments to add those students.
  const [depts, setDepts] = useState<any[]>([]);
  const [deptSel, setDeptSel] = useState<string[]>([]);
  const [selYear, setSelYear] = useState('');
  const [rangeA, setRangeA] = useState('');
  const [rangeB, setRangeB] = useState('');
  const [rollText, setRollText] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [pickSearch, setPickSearch] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());

  useEffect(() => {
    get('/api/exams').then(e => { setExams(e); if (!examId && e.length) setExamId(String(e[0].id)); }).catch(() => {});
    get('/api/rooms').then(r => { setRooms(r); setRoomSel(prev => prev.size ? prev : new Set((r || []).filter((x: any) => x.status === 'Available').map((x: any) => x.id))); }).catch(() => {});
    get('/api/buildings').then(setBuildings).catch(() => {});
    get('/api/departments').then(setDepts).catch(() => {});
    get('/api/students').then(setAllStudents).catch(() => {});
    get('/api/settings').then(s => { setSettings(s); if (s.seat_format) setSeatFmt(s.seat_format); }).catch(() => {});
  }, []);
  useEffect(() => {
    if (examId) get('/api/exam-students?exam_id=' + examId).then(l => setSelCount(l.length)).catch(() => setSelCount(0));
  }, [examId]);
  const avail = rooms.filter(r => r.status === 'Available' && (!filterB || String(r.building_id) === filterB));
  const chosen = rooms.filter(r => roomSel.has(r.id));
  const totalCap = chosen.reduce((a, r) => a + (Number(r.capacity) || 0), 0);
  const previewCount = selCount || allStudents.filter(s =>
    (!deptSel.length || deptSel.includes(s.department)) && (!selYear || s.admission_year === selYear)).length;
  const previewByDept = depts.map((d: any) => ({
    code: d.dept_code,
    count: allStudents.filter(s => s.department === d.dept_code && (!selYear || s.admission_year === selYear)).length,
  }));
  const toggle = (id: number) => { const n = new Set(roomSel); if (n.has(id)) n.delete(id); else n.add(id); setRoomSel(n); };
  const toggleAll = () => { if (roomSel.size === avail.length) setRoomSel(new Set()); else setRoomSel(new Set(avail.map(r => r.id))); };
  const toggleDept = (code: string) => setDeptSel(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const generate = async (inlineSel?: any) => {
    setMsg(null); setResult(null);
    if (!examId) { setMsg({ type: 'error', text: 'Select an exam' }); return; }
    if (!roomSel.size) { setMsg({ type: 'error', text: 'Select at least one room' }); return; }
    // If the exam has no linked students yet, require an inline selection.
    if (!selCount && !inlineSel && !deptSel.length && !selYear && !(rangeA && rangeB) && !rollText.trim() && !picked.size) {
      setMsg({ type: 'error', text: 'No students selected for this exam yet. Use Step 1: tick one or more departments (students are added WITH their department), and/or year / range / roll numbers / individuals — then Generate.' });
      return;
    }
    setBusy(true);
    try {
      let payload: any = { exam_id: Number(examId), room_ids: [...roomSel], seat_format: seatFmt };
      if (inlineSel) Object.assign(payload, inlineSel);
      else if (!selCount) {
        if (picked.size) payload.student_ids = [...picked];
        else if (rollText.trim()) payload.roll_numbers = rollText.split(/[\s,;\n]+/).filter(Boolean);
        else payload = { ...payload, departments: deptSel.length ? deptSel : undefined, admission_year: selYear || undefined, range_start: rangeA || undefined, range_end: rangeB || undefined };
      }
      const r = await post('/api/allotment-generate', payload);
      setResult(r);
      // refresh linked-student count after inline selection was persisted
      try { const l = await get('/api/exam-students?exam_id=' + examId); setSelCount(l.length); } catch {}
      setMsg({ type: r.warning ? 'error' : 'ok', text: `Draft saved: ${r.totalStudents} students → ${r.roomsUsed} rooms.` + (r.warning ? ' WARNING: ' + r.warning : '') });
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  const candidates = allStudents.filter(s =>
    (!pickSearch || (s.roll_number + s.name).toLowerCase().includes(pickSearch.toLowerCase())) &&
    (!deptSel.length || deptSel.includes(s.department))
  ).slice(0, 40);
  const togglePick = (id: number) => { const n = new Set(picked); if (n.has(id)) n.delete(id); else n.add(id); setPicked(n); };

  return (
    <div>
      <PageHead title="Automatic Hall Allotment" sub="Suggestion saved as DRAFT — validate & finalize after review" />
      <Msg msg={msg} />
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">1 • Exam & Students</h3>
          <label className="text-sm font-semibold">Exam</label>
          <select value={examId} onChange={e => setExamId(e.target.value)} className={inputCls + ' mb-2'}>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_code} • {e.subject} • {e.exam_date}</option>)}</select>
          <div className="bg-blue-50 rounded-lg p-3 text-sm mb-2">Students already linked to this exam: <b>{selCount}</b></div>
          <label className="text-sm font-semibold">Departments <span className="font-normal text-slate-500">(tick one or more — students added WITH department)</span></label>
          <div className="border rounded-lg p-2 mb-2 max-h-32 overflow-y-auto space-y-1">
            {depts.map((d: any) => {
              const c = previewByDept.find(x => x.code === d.dept_code)?.count ?? 0;
              return (
                <label key={d.id} className="flex items-center gap-2 text-sm px-1.5 py-1 hover:bg-slate-50 rounded cursor-pointer">
                  <input type="checkbox" checked={deptSel.includes(d.dept_code)} onChange={() => toggleDept(d.dept_code)} />
                  <span className="font-semibold">{d.dept_code}</span>
                  <span className="text-slate-500 truncate text-xs">{d.dept_name}</span>
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{c}</span>
                </label>
              );
            })}
            {!depts.length && <p className="text-xs text-slate-400 p-1">No departments found.</p>}
          </div>
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setDeptSel(depts.map((d: any) => d.dept_code))} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-semibold">All Depts</button>
            <button type="button" onClick={() => setDeptSel([])} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-semibold">Clear</button>
            {deptSel.length > 0 && <span className="text-xs text-blue-700 font-semibold self-center">{previewCount} student(s) in selection</span>}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div><label className="text-xs font-semibold">Adm. year</label><input value={selYear} onChange={e => setSelYear(e.target.value)} className={inputCls} placeholder="24" /></div>
            <div><label className="text-xs font-semibold">Range from</label><input value={rangeA} onChange={e => setRangeA(e.target.value)} className={inputCls} placeholder="24BCS001" /></div>
            <div><label className="text-xs font-semibold">Range to</label><input value={rangeB} onChange={e => setRangeB(e.target.value)} className={inputCls} placeholder="24BCS100" /></div>
          </div>
          <label className="text-sm font-semibold">Paste roll numbers (comma / newline)</label>
          <textarea value={rollText} onChange={e => setRollText(e.target.value)} rows={2} className={inputCls + ' mb-2'} placeholder="24BCS001, 24BCS002 ..." />
          <label className="text-sm font-semibold">Or tick individuals</label>
          <input value={pickSearch} onChange={e => setPickSearch(e.target.value)} className={inputCls + ' mb-1'} placeholder="Search roll / name..." />
          <div className="max-h-28 overflow-y-auto border rounded-lg p-1 mb-2 space-y-0.5">
            {candidates.map((s: any) => (
              <label key={s.id} className="flex items-center gap-2 text-xs px-1.5 py-1 hover:bg-slate-50 rounded">
                <input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} />
                <span className="font-semibold">{s.roll_number}</span><span className="text-slate-500 truncate">{s.name}</span>
              </label>))}
            {!candidates.length && <p className="text-xs text-slate-400 p-1">No candidates.</p>}
          </div>
          {picked.size > 0 && <p className="text-xs text-blue-700 mb-2 font-semibold">{picked.size} individual(s) ticked — they will be used first.</p>}
          <label className="text-sm font-semibold mt-1 block">Seat Format</label>
          <select value={seatFmt} onChange={e => setSeatFmt(e.target.value)} className={inputCls}>
            <option value="A01">A01, A02, A03...</option>
            <option value="NUM">1, 2, 3...</option>
          </select>
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">2 • Capacity Calculation</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Students (linked / preview)</span><b>{selCount || `${previewCount} (preview)`}</b></div>
            <div className="flex justify-between"><span>Rooms Chosen</span><b>{chosen.length}</b></div>
            <div className="flex justify-between"><span>Total Available Capacity</span><b className={(totalCap >= (selCount || previewCount)) ? 'text-green-600' : 'text-red-600'}>{totalCap}</b></div>
            <div className="flex justify-between"><span>Balance</span><b className={(totalCap - (selCount || previewCount)) >= 0 ? 'text-green-600' : 'text-red-600'}>{totalCap - (selCount || previewCount)}</b></div>
          </div>
          {(totalCap < (selCount || previewCount)) && <p className="text-xs text-red-600 mt-2 font-semibold">Insufficient capacity — tick more rooms.</p>}
          {totalCap >= (selCount || previewCount) && (selCount || previewCount) > 0 && <p className="text-xs text-green-600 mt-2 font-semibold">Capacity OK. Departments will be mixed across rooms.</p>}
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">3 • Generate</h3>
          <p className="text-xs text-slate-500 mb-3">Rules: never exceed capacity • only Available rooms • every student gets a unique seat • dept mixing • one staff per room.</p>
          <button onClick={() => generate()} disabled={busy} className={btnPrimary + ' w-full disabled:opacity-60'}>{busy ? 'Generating...' : selCount ? `Generate Allotment for ${selCount} Students (Draft)` : deptSel.length ? `Add ${previewCount} ${deptSel.join('+')} Student(s) & Generate (Draft)` : 'Generate Allotment (Draft)'}</button>
          {result && <button onClick={() => nav('/allotment/' + result.allotment_id)} className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Open Draft for Review →</button>}
        </Card>
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <h3 className="font-bold text-blue-900">Select Buildings & Rooms (Available only)</h3>
          <select value={filterB} onChange={e => setFilterB(e.target.value)} className={inputCls + ' max-w-[220px] ml-auto'}><option value="">All Buildings</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <button onClick={toggleAll} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg font-semibold">{roomSel.size === avail.length ? 'Untick All' : 'Tick All Available'}</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
          {avail.map(r => (
            <label key={r.id} className={`border rounded-lg px-3 py-2 text-sm cursor-pointer flex items-center gap-2 ${roomSel.has(r.id) ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
              <input type="checkbox" checked={roomSel.has(r.id)} onChange={() => toggle(r.id)} />
              <span><b>{r.room_number}</b> <span className="text-slate-500">• cap {r.capacity}</span></span>
            </label>))}
          {!avail.length && <p className="text-sm text-slate-400">No available rooms. Mark rooms Available first.</p>}
        </div>
      </Card>
    </div>
  );
}
