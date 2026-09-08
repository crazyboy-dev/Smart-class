import { useState } from 'react';
import { post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';

export default function Departments() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/departments');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ dept_code: '', dept_name: '', status: 'Active' });
  const [editId, setEditId] = useState<number | null>(null);
  const openAdd = () => { setForm({ dept_code: '', dept_name: '', status: 'Active' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ dept_code: r.dept_code, dept_name: r.dept_name, status: r.status }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/departments', { id: editId, ...form });
      else await post('/api/departments', form);
      setShow(false); setMsg({ type: 'ok', text: 'Department saved' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => { try { await del('/api/departments', { id: r.id }); setMsg({ type: 'ok', text: 'Department deleted' }); fetchRows(); } catch (e: any) { setMsg({ type: 'error', text: e.message }); } };
  return (
    <div>
      <PageHead title="Departments" sub="dept_code is used when generating roll numbers" right={<button onClick={openAdd} className={btnPrimary}>+ Add Department</button>} />
      <Msg msg={msg} />
      <Card className="p-4">
        {loading ? <p className="text-blue-700">Loading...</p> : <CrudTable cols={['id', 'dept_code', 'dept_name', 'status']} rows={rows} onEdit={openEdit} onDelete={remove} />}
      </Card>
      {show && <Modal title={editId ? 'Edit Department' : 'Add Department'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">Dept Code * (e.g. BCS)</label><input required value={form.dept_code} onChange={e => setForm({ ...form, dept_code: e.target.value })} className={inputCls} placeholder="BCS" /></div>
          <div><label className="text-sm font-semibold">Dept Name *</label><input required value={form.dept_name} onChange={e => setForm({ ...form, dept_name: e.target.value })} className={inputCls} placeholder="B.Sc Computer Science" /></div>
          <div><label className="text-sm font-semibold">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Active</option><option>Inactive</option></select></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
