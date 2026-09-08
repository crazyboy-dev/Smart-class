import { useEffect, useState } from 'react';
import { get, post, put, del, downloadCSV } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';
import { Upload, Download, Trash2 } from 'lucide-react';

export default function Students() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/students');
  const [depts, setDepts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [fD, setFD] = useState(''); const [fY, setFY] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ roll_number: '', name: '', department: '', admission_year: '' });
  const [editId, setEditId] = useState<number | null>(null);
  const [gen, setGen] = useState({ admission_year: '24', department: 'BCS', start: '1', end: '10', name_prefix: 'Student' });
  const [csvText, setCsvText] = useState('');
  const [wiping, setWiping] = useState(false);
  useEffect(() => { get('/api/departments').then(setDepts).catch(() => {}); }, []);
  const openAdd = () => { setForm({ roll_number: '', name: '', department: '', admission_year: '' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ roll_number: r.roll_number, name: r.name, department: r.department || '', admission_year: r.admission_year || '' }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/students', { id: editId, ...form });
      else await post('/api/students', form);
      setShow(false); setMsg({ type: 'ok', text: 'Student saved' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => { try { await del('/api/students', { id: r.id }); setMsg({ type: 'ok', text: 'Student deleted' }); fetchRows(); } catch (e: any) { setMsg({ type: 'error', text: e.message }); } };
  const generate = async () => {
    try {
      const r = await post('/api/students', { generate: true, ...gen });
      setMsg({ type: 'ok', text: `Generated ${r.length} roll numbers` }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const importCSV = async () => {
    try {
      const lines = csvText.trim().split('\n').filter(Boolean);
      if (!lines.length) { setMsg({ type: 'error', text: 'Paste CSV rows first (roll_number,name,department,admission_year)' }); return; }
      const rowsIn = lines.map(l => {
        const p = l.split(',').map(x => x.trim());
        return { roll_number: p[0], name: p[1] || p[0], department: p[2] || null, admission_year: p[3] || null };
      });
      const r = await post('/api/students', { bulk: true, rows: rowsIn });
      setMsg({ type: 'ok', text: `Imported ${r.length} students` }); setCsvText(''); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const filtered = rows.filter(r => (!fD || r.department === fD) && (!fY || r.admission_year === fY) && (!search || (r.roll_number + r.name).toLowerCase().includes(search.toLowerCase())));
  const wipeDept = async () => {
    if (!fD) { setMsg({ type: 'error', text: 'Select a department filter first to delete that department\u2019s students.' }); return; }
    if (!window.confirm(`Delete ALL ${filtered.length} student(s) in department ${fD} (plus their exam links & seating)? This cannot be undone.`)) return;
    if (!window.confirm(`Final confirmation: permanently wipe every ${fD} student record?`)) return;
    setWiping(true);
    try {
      const r = await del(`/api/students?delete_all=true&department=${encodeURIComponent(fD)}`);
      setMsg({ type: 'ok', text: `Deleted all ${r.count ?? filtered.length} student(s) in ${fD}. Master data (departments, rooms, staff, exams) untouched.` });
      fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setWiping(false); }
  };
  const wipeAll = async () => {
    if (!rows.length) { setMsg({ type: 'error', text: 'No student data to delete.' }); return; }
    if (!window.confirm(`Delete ALL ${rows.length} student(s) plus their exam selections & seating? This cannot be undone.`)) return;
    const typed = window.prompt(`Type DELETE to permanently wipe all ${rows.length} student records:`);
    if (typed !== 'DELETE') { setMsg({ type: 'error', text: 'Delete-all cancelled. Type DELETE exactly to confirm.' }); return; }
    setWiping(true);
    try {
      await del('/api/students?delete_all=true');
      setMsg({ type: 'ok', text: 'Deleted ALL student data (students + exam links + seating). Departments, rooms, staff, exams untouched.' });
      fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setWiping(false); }
  };
  return (
    <div>
      <PageHead title="Students / Roll Numbers" sub="Primary identifier = Roll Number (e.g. 24BCS076)" right={<>
        <button onClick={() => downloadCSV('students.csv', filtered, ['roll_number', 'name', 'department', 'admission_year'])} className={btnGhost}>Export CSV/Excel</button>
        <button onClick={wipeDept} disabled={wiping || !fD} title={fD ? `Delete all students in ${fD}` : 'Select a department filter first'} className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Trash2 size={14} /> Delete {fD || 'Dept'} Data</button>
        <button onClick={wipeAll} disabled={wiping} title="Delete ALL student records" className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Trash2 size={14} /> Delete All Data</button>
        <button onClick={openAdd} className={btnPrimary}>+ Add Student</button>
      </>} />
      <Msg msg={msg} />
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">Automatic Generation</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input value={gen.admission_year} onChange={e => setGen({ ...gen, admission_year: e.target.value })} className={inputCls} placeholder="Year (24)" />
            <select value={gen.department} onChange={e => setGen({ ...gen, department: e.target.value })} className={inputCls}>{depts.map(d => <option key={d.id} value={d.dept_code}>{d.dept_code}</option>)}{!depts.length && <option>BCS</option>}</select>
            <input value={gen.name_prefix} onChange={e => setGen({ ...gen, name_prefix: e.target.value })} className={inputCls} placeholder="Name prefix" />
            <input type="number" value={gen.start} onChange={e => setGen({ ...gen, start: e.target.value })} className={inputCls} placeholder="Start" />
            <input type="number" value={gen.end} onChange={e => setGen({ ...gen, end: e.target.value })} className={inputCls} placeholder="End" />
            <button onClick={generate} className={btnPrimary}>Generate</button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Format: 2-digit year + dept code + 3-digit number. Duplicates are blocked.</p>
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-1"><Upload size={16} /> CSV Import <span className="text-xs font-normal text-slate-500">(roll_number,name,department,year per line)</span></h3>
          <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={3} className={inputCls} placeholder="24BCS101,Asha Devi,BCS,24" />
          <button onClick={importCSV} className={btnPrimary + ' mt-2'}>Import</button>
        </Card>
      </div>
      <Card className="p-4">
        <div className="flex gap-2 mb-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roll / name..." className={inputCls + ' max-w-xs'} />
          <select value={fD} onChange={e => setFD(e.target.value)} className={inputCls + ' max-w-[160px]'}><option value="">All Depts</option>{depts.map(d => <option key={d.id} value={d.dept_code}>{d.dept_code}</option>)}</select>
          <input value={fY} onChange={e => setFY(e.target.value)} placeholder="Year" className={inputCls + ' max-w-[120px]'} />
          <span className="text-sm text-slate-500 self-center flex items-center gap-1"><Download size={14} /> {filtered.length} students</span>
        </div>
        {loading ? <p className="text-blue-700">Loading...</p> : <CrudTable cols={['roll_number', 'name', 'department', 'admission_year']} rows={filtered} onEdit={openEdit} onDelete={remove} />}
      </Card>
      {show && <Modal title={editId ? 'Edit Student' : 'Add Student'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">Roll Number *</label><input required value={form.roll_number} onChange={e => setForm({ ...form, roll_number: e.target.value })} className={inputCls} placeholder="24BCS076" /></div>
          <div><label className="text-sm font-semibold">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-sm font-semibold">Department</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inputCls} placeholder="BCS" /></div>
            <div><label className="text-sm font-semibold">Admission Year</label><input value={form.admission_year} onChange={e => setForm({ ...form, admission_year: e.target.value })} className={inputCls} placeholder="24" /></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
