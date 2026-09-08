import { useEffect, useState } from 'react';
import { get, post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';

export default function Floors() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/floors');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [filterB, setFilterB] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ building_id: '', floor_number: '', status: 'Active' });
  const [editId, setEditId] = useState<number | null>(null);
  useEffect(() => { get('/api/buildings').then(setBuildings).catch(() => {}); }, []);
  const bName = (id: number) => (buildings.find(b => b.id === id) || {}).name || ('#' + id);
  const openAdd = () => { setForm({ building_id: filterB || '', floor_number: '', status: 'Active' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ building_id: r.building_id, floor_number: r.floor_number, status: r.status }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/floors', { id: editId, ...form });
      else await post('/api/floors', form);
      setShow(false); setMsg({ type: 'ok', text: 'Floor saved' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => { try { await del('/api/floors', { id: r.id }); setMsg({ type: 'ok', text: 'Floor deleted' }); fetchRows(); } catch (e: any) { setMsg({ type: 'error', text: e.message }); } };
  const filtered = rows.filter(r => !filterB || String(r.building_id) === String(filterB));
  const view = filtered.map(r => ({ ...r, building: bName(r.building_id) }));
  return (
    <div>
      <PageHead title="Floors" sub="One building can contain multiple floors" right={<button onClick={openAdd} className={btnPrimary}>+ Add Floor</button>} />
      <Msg msg={msg} />
      <Card className="p-4">
        <select value={filterB} onChange={e => setFilterB(e.target.value)} className={inputCls + ' max-w-sm mb-3'}>
          <option value="">All Buildings</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
        </select>
        {loading ? <p className="text-blue-700">Loading...</p> : <CrudTable cols={['id', 'building', 'floor_number', 'status']} rows={view} onEdit={openEdit} onDelete={remove} />}
      </Card>
      {show && <Modal title={editId ? 'Edit Floor' : 'Add Floor'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">Building *</label><select required value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value })} className={inputCls}><option value="">Select building</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></div>
          <div><label className="text-sm font-semibold">Floor Number / Name *</label><input required value={form.floor_number} onChange={e => setForm({ ...form, floor_number: e.target.value })} className={inputCls} placeholder="Ground Floor" /></div>
          <div><label className="text-sm font-semibold">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Active</option><option>Inactive</option></select></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
