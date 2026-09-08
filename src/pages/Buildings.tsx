import { useState } from 'react';
import { post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';

export default function Buildings() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/buildings');
  const [search, setSearch] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ name: '', code: '', status: 'Active' });
  const [editId, setEditId] = useState<number | null>(null);
  const openAdd = () => { setForm({ name: '', code: '', status: 'Active' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ name: r.name, code: r.code, status: r.status }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/buildings', { id: editId, ...form });
      else await post('/api/buildings', form);
      setShow(false); setMsg({ type: 'ok', text: 'Building saved successfully' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => {
    try { await del('/api/buildings', { id: r.id }); setMsg({ type: 'ok', text: 'Building deleted' }); fetchRows(); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const filtered = rows.filter(r => !search || (r.name + r.code).toLowerCase().includes(search.toLowerCase()));
  return (
    <div>
      <PageHead title="Buildings" sub="Manage exam buildings" right={<button onClick={openAdd} className={btnPrimary}>+ Add Building</button>} />
      <Msg msg={msg} />
      <Card className="p-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search buildings..." className={inputCls + ' max-w-sm mb-3'} />
        {loading ? <p className="text-blue-700">Loading...</p> : <CrudTable cols={['id', 'name', 'code', 'status']} rows={filtered} onEdit={openEdit} onDelete={remove} />}
      </Card>
      {show && <Modal title={editId ? 'Edit Building' : 'Add Building'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">Building Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Main Block" /></div>
          <div><label className="text-sm font-semibold">Building Code *</label><input required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className={inputCls} placeholder="MB" /></div>
          <div><label className="text-sm font-semibold">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Active</option><option>Inactive</option></select></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
