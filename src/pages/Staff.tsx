import { useState } from 'react';
import { post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';

export default function Staff() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/staff');
  const [search, setSearch] = useState('');
  const [fA, setFA] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ name: '', department: '', availability: 'Available' });
  const [editId, setEditId] = useState<number | null>(null);
  const openAdd = () => { setForm({ name: '', department: '', availability: 'Available' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ name: r.name, department: r.department || '', availability: r.availability }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/staff', { id: editId, ...form });
      else await post('/api/staff', form);
      setShow(false); setMsg({ type: 'ok', text: 'Staff saved' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => { try { await del('/api/staff', { id: r.id }); setMsg({ type: 'ok', text: 'Staff deleted' }); fetchRows(); } catch (e: any) { setMsg({ type: 'error', text: e.message }); } };
  const filtered = rows.filter(r => (!fA || r.availability === fA) && (!search || (r.name + (r.department || '')).toLowerCase().includes(search.toLowerCase())));
  return (
    <div>
      <PageHead title="Staff" sub="One staff member = one room per exam session. Only Available staff are auto-assigned." right={<button onClick={openAdd} className={btnPrimary}>+ Add Staff</button>} />
      <Msg msg={msg} />
      <Card className="p-4">
        <div className="flex gap-2 mb-3 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." className={inputCls + ' max-w-xs'} />
          <select value={fA} onChange={e => setFA(e.target.value)} className={inputCls + ' max-w-[200px]'}><option value="">All Availability</option><option>Available</option><option>Unavailable</option></select>
        </div>
        {loading ? <p className="text-blue-700">Loading...</p> : <CrudTable cols={['id', 'name', 'department', 'availability']} rows={filtered} onEdit={openEdit} onDelete={remove} />}
      </Card>
      {show && <Modal title={editId ? 'Edit Staff' : 'Add Staff'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">Staff Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Kumar" /></div>
          <div><label className="text-sm font-semibold">Department (optional)</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inputCls} placeholder="BCS" /></div>
          <div><label className="text-sm font-semibold">Availability</label><select value={form.availability} onChange={e => setForm({ ...form, availability: e.target.value })} className={inputCls}><option>Available</option><option>Unavailable</option></select></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
