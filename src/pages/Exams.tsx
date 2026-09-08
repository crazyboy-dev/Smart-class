import { useState } from 'react';
import { Link } from 'react-router-dom';
import { post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';

const TYPES = ['CIA 1', 'CIA 2', 'Model Exam', 'Other'];

export default function Exams() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/exams');
  const [fT, setFT] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ exam_code: '', subject: '', exam_type: 'CIA 1', exam_date: '', start_time: '09:00', end_time: '12:00', status: 'Scheduled' });
  const [editId, setEditId] = useState<number | null>(null);
  const openAdd = () => { setForm({ exam_code: '', subject: '', exam_type: 'CIA 1', exam_date: '', start_time: '09:00', end_time: '12:00', status: 'Scheduled' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ exam_code: r.exam_code, subject: r.subject, exam_type: r.exam_type, exam_date: r.exam_date, start_time: r.start_time || '', end_time: r.end_time || '', status: r.status }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/exams', { id: editId, ...form });
      else await post('/api/exams', form);
      setShow(false); setMsg({ type: 'ok', text: 'Exam saved' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => { try { await del('/api/exams', { id: r.id }); setMsg({ type: 'ok', text: 'Exam deleted' }); fetchRows(); } catch (e: any) { setMsg({ type: 'error', text: e.message }); } };
  const filtered = rows.filter(r => !fT || r.exam_type === fT);
  return (
    <div>
      <PageHead title="Exams" sub="Exam code must be unique" right={<button onClick={openAdd} className={btnPrimary}>+ Create Exam</button>} />
      <Msg msg={msg} />
      <Card className="p-4">
        <select value={fT} onChange={e => setFT(e.target.value)} className={inputCls + ' max-w-[220px] mb-3'}><option value="">All Types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        {loading ? <p className="text-blue-700">Loading...</p> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-blue-50 text-blue-900"><th className="text-left px-3 py-2">Code</th><th className="text-left px-3 py-2">Subject</th><th className="text-left px-3 py-2">Type</th><th className="text-left px-3 py-2">Date</th><th className="text-left px-3 py-2">Time</th><th className="text-left px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>{filtered.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 font-semibold">{r.exam_code}</td><td className="px-3 py-2">{r.subject}</td><td className="px-3 py-2">{r.exam_type}</td>
                <td className="px-3 py-2">{r.exam_date}</td><td className="px-3 py-2">{r.start_time || ''}-{r.end_time || ''}</td><td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Link to={`/exam-students?exam=${r.id}`} className="text-green-700 text-xs font-semibold bg-green-50 px-2 py-1 rounded mr-1">Students</Link>
                  <Link to={`/create-allotment?exam=${r.id}`} className="text-blue-700 text-xs font-semibold bg-blue-50 px-2 py-1 rounded mr-1">Allot</Link>
                  <button onClick={() => openEdit(r)} className="text-blue-600 text-xs font-semibold px-1">Edit</button>
                  <button onClick={() => { if (window.confirm('Delete exam and its student selection?')) remove(r); }} className="text-red-600 text-xs font-semibold px-1">Delete</button>
                </td>
              </tr>))}
              {!filtered.length && <tr><td colSpan={7} className="text-center py-6 text-slate-400">No exams found.</td></tr>}
            </tbody></table></div>}
      </Card>
      {show && <Modal title={editId ? 'Edit Exam' : 'Create Exam'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-sm font-semibold">Exam Code *</label><input required value={form.exam_code} onChange={e => setForm({ ...form, exam_code: e.target.value })} className={inputCls} placeholder="CIA1-CS201" /></div>
            <div><label className="text-sm font-semibold">Type</label><select value={form.exam_type} onChange={e => setForm({ ...form, exam_type: e.target.value })} className={inputCls}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div><label className="text-sm font-semibold">Subject *</label><input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className={inputCls} /></div>
          <div><label className="text-sm font-semibold">Exam Date *</label><input required type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} className={inputCls} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-sm font-semibold">Start</label><input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className={inputCls} /></div>
            <div><label className="text-sm font-semibold">End</label><input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className={inputCls} /></div>
            <div><label className="text-sm font-semibold">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Scheduled</option><option>Ongoing</option><option>Completed</option><option>Cancelled</option></select></div>
          </div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
