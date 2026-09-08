import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { get, post, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { inputCls, btnPrimary, btnGhost } from '../components/Crud';

export default function ExamStudents() {
  const [sp] = useSearchParams();
  const [exams, setExams] = useState<any[]>([]);
  const [examId, setExamId] = useState(sp.get('exam') || '');
  const [list, setList] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [msg, setMsg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deptSel, setDeptSel] = useState<string[]>([]);
  const [selYear, setSelYear] = useState('');
  const [rangeA, setRangeA] = useState(''); const [rangeB, setRangeB] = useState('');
  const [rollText, setRollText] = useState('');
  const [pickSearch, setPickSearch] = useState('');
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    get('/api/exams').then(e => { setExams(e); if (!examId && e.length) setExamId(String(e[0].id)); }).catch(() => {});
    get('/api/departments').then(setDepts).catch(() => {});
    get('/api/students').then(setAllStudents).catch(() => {});
  }, []);
  const fetchList = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try { setList(await get('/api/exam-students?exam_id=' + id)); } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (examId) fetchList(examId); }, [examId]);

  const add = async (payload: any) => {
    try { await post('/api/exam-students', { exam_id: Number(examId), ...payload }); setMsg({ type: 'ok', text: 'Students added' }); fetchList(examId); setChecked(new Set()); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const removeOne = async (id: number) => {
    if (!window.confirm('Remove this student from the exam?')) return;
    try { await del('/api/exam-students', { id }); setMsg({ type: 'ok', text: 'Removed' }); fetchList(examId); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const clearAll = async () => {
    if (!window.confirm('Remove ALL selected students for this exam?')) return;
    try { await del('/api/exam-students?exam_id=' + examId + '&clear=true'); setMsg({ type: 'ok', text: 'Selection cleared' }); fetchList(examId); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const candidates = allStudents.filter(s =>
    (!pickSearch || (s.roll_number + s.name).toLowerCase().includes(pickSearch.toLowerCase())) &&
    (!deptSel.length || deptSel.includes(s.department)) && !list.find(l => l.roll_number === s.roll_number)
  ).slice(0, 60);
  const toggle = (id: number) => { const n = new Set(checked); if (n.has(id)) n.delete(id); else n.add(id); setChecked(n); };
  const toggleDept = (code: string) => setDeptSel(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  const deptCounts = depts.map((d: any) => ({ code: d.dept_code, count: allStudents.filter(s => s.department === d.dept_code && (!selYear || s.admission_year === selYear)).length }));

  return (
    <div>
      <PageHead title="Exam Student Selection" sub="Select students by roll, department, year, range or import" right={<Link to={`/create-allotment?exam=${examId}`} className={btnPrimary}>Continue to Allotment →</Link>} />
      <Msg msg={msg} />
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div><label className="text-sm font-semibold">Exam</label><select value={examId} onChange={e => setExamId(e.target.value)} className={inputCls + ' min-w-[220px]'}>{exams.map(e => <option key={e.id} value={e.id}>{e.exam_code} • {e.subject}</option>)}</select></div>
          <div className="ml-auto bg-blue-50 text-blue-900 px-4 py-2 rounded-lg font-bold">Total Selected: {list.length}</div>
          {list.length > 0 && <button onClick={clearAll} className={btnGhost}>Clear All</button>}
        </div>
      </Card>
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">By Department(s) / Year / Range</h3>
          <p className="text-xs text-slate-500 mb-2">Tick one or more departments — students are added WITH their department. Combine with year / roll range to narrow down.</p>
          <div className="border rounded-lg p-2 mb-2 max-h-36 overflow-y-auto space-y-1">
            {depts.map((d: any) => {
              const c = deptCounts.find(x => x.code === d.dept_code)?.count ?? 0;
              return (
                <label key={d.id} className="flex items-center gap-2 text-sm border rounded px-2 py-1 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={deptSel.includes(d.dept_code)} onChange={() => toggleDept(d.dept_code)} />
                  <span className="font-semibold">{d.dept_code}</span>
                  <span className="text-slate-500 text-xs truncate">{d.dept_name}</span>
                  <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{c}</span>
                </label>
              );
            })}
            {!depts.length && <p className="text-xs text-slate-400">No departments found.</p>}
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => setDeptSel(depts.map((d: any) => d.dept_code))} className={btnGhost + ' flex-1'}>All</button>
            <button onClick={() => setDeptSel([])} className={btnGhost + ' flex-1'}>Clear</button>
          </div>
          <div className="space-y-2">
            <input value={selYear} onChange={e => setSelYear(e.target.value)} className={inputCls} placeholder="Admission year (e.g. 24)" />
            <div className="grid grid-cols-2 gap-2"><input value={rangeA} onChange={e => setRangeA(e.target.value)} className={inputCls} placeholder="Range from" /><input value={rangeB} onChange={e => setRangeB(e.target.value)} className={inputCls} placeholder="Range to" /></div>
            <button onClick={() => {
              if (!deptSel.length && !selYear && !(rangeA && rangeB)) { setMsg({ type: 'error', text: 'Tick at least one department, or enter a year / roll range.' }); return; }
              add({ departments: deptSel.length ? deptSel : undefined, admission_year: selYear || undefined, range_start: rangeA || undefined, range_end: rangeB || undefined });
            }} className={btnPrimary + ' w-full'}>Add Matching Students{deptSel.length > 0 ? ` (${deptSel.join(', ')})` : ''}</button>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">By Roll Numbers (paste / import)</h3>
          <textarea value={rollText} onChange={e => setRollText(e.target.value)} rows={4} className={inputCls} placeholder="24BCS001, 24BCS002 (comma or newline separated)" />
          <button onClick={() => { const rns = rollText.split(/[\s,;\n]+/).filter(Boolean); if (!rns.length) { setMsg({ type: 'error', text: 'Enter at least one roll number' }); return; } add({ roll_numbers: rns }); setRollText(''); }} className={btnPrimary + ' w-full mt-2'}>Add Roll Numbers</button>
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">Pick Individuals</h3>
          <input value={pickSearch} onChange={e => setPickSearch(e.target.value)} className={inputCls + ' mb-2'} placeholder="Search..." />
          <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
            {candidates.map(s => (
              <label key={s.id} className="flex items-center gap-2 text-sm border rounded px-2 py-1 hover:bg-slate-50">
                <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="font-semibold">{s.roll_number}</span><span className="text-slate-500">{s.name}</span>
              </label>))}
            {!candidates.length && <p className="text-xs text-slate-400">No candidates.</p>}
          </div>
          <button onClick={() => { if (!checked.size) { setMsg({ type: 'error', text: 'Tick at least one student' }); return; } add({ student_ids: [...checked] }); }} className={btnPrimary + ' w-full'}>Add Ticked ({checked.size})</button>
        </Card>
      </div>
      <Card className="p-4">
        <h3 className="font-bold text-blue-900 mb-2">Selected Students ({list.length})</h3>
        {loading ? <p className="text-blue-700">Loading...</p> :
          <div className="overflow-x-auto max-h-96 overflow-y-auto"><table className="w-full text-sm">
            <thead className="sticky top-0 bg-blue-50"><tr><th className="text-left px-3 py-2">Roll</th><th className="px-3 py-2">Action</th></tr></thead>
            <tbody>{list.map((l: any) => <tr key={l.id} className="border-t"><td className="px-3 py-1.5 font-semibold">{l.roll_number}</td><td className="px-3 py-1.5"><button onClick={() => removeOne(l.id)} className="text-red-600 text-xs font-semibold">Remove</button></td></tr>)}
              {!list.length && <tr><td colSpan={2} className="text-center py-6 text-slate-400">No students selected yet.</td></tr>}</tbody></table></div>}
      </Card>
    </div>
  );
}
