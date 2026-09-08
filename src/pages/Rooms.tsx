import { useEffect, useState } from 'react';
import { get, post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { useCrud, CrudTable, Modal, inputCls, btnPrimary, btnGhost } from '../components/Crud';

export default function Rooms() {
  const { rows, loading, msg, setMsg, fetchRows } = useCrud('/api/rooms');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [fB, setFB] = useState(''); const [fF, setFF] = useState(''); const [fS, setFS] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<any>({ building_id: '', floor_id: '', room_number: '', capacity: 45, status: 'Available' });
  const [editId, setEditId] = useState<number | null>(null);
  useEffect(() => {
    get('/api/buildings').then(setBuildings).catch(() => {});
    get('/api/floors').then(setFloors).catch(() => {});
    get('/api/settings').then(setSettings).catch(() => {});
  }, []);
  useEffect(() => { if (settings.default_capacity && !editId) setForm((f: any) => ({ ...f, capacity: settings.default_capacity })); }, [settings]);
  const bName = (id: number) => (buildings.find(b => b.id === id) || {}).name || '';
  const fName = (id: number) => (floors.find(f => f.id === id) || {}).floor_number || '';
  const floorsFor = (bid: any) => floors.filter(f => !bid || String(f.building_id) === String(bid));
  const openAdd = () => { setForm({ building_id: fB || '', floor_id: fF || '', room_number: '', capacity: settings.default_capacity || 45, status: 'Available' }); setEditId(null); setShow(true); };
  const openEdit = (r: any) => { setForm({ building_id: r.building_id, floor_id: r.floor_id, room_number: r.room_number, capacity: r.capacity, status: r.status }); setEditId(r.id); setShow(true); };
  const save = async (e: any) => {
    e.preventDefault();
    try {
      if (editId) await put('/api/rooms', { id: editId, ...form });
      else await post('/api/rooms', form);
      setShow(false); setMsg({ type: 'ok', text: 'Room saved' }); fetchRows();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const remove = async (r: any) => { try { await del('/api/rooms', { id: r.id }); setMsg({ type: 'ok', text: 'Room deleted' }); fetchRows(); } catch (e: any) { setMsg({ type: 'error', text: e.message }); } };
  const filtered = rows.filter(r => (!fB || String(r.building_id) === fB) && (!fF || String(r.floor_id) === fF) && (!fS || r.status === fS));
  const view = filtered.map(r => ({ ...r, building: bName(r.building_id), floor: fName(r.floor_id) }));
  return (
    <div>
      <PageHead title="Rooms" sub="Only Available rooms are used in automatic allotment" right={<button onClick={openAdd} className={btnPrimary}>+ Add Room</button>} />
      <Msg msg={msg} />
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={fB} onChange={e => { setFB(e.target.value); setFF(''); }} className={inputCls + ' max-w-[200px]'}><option value="">All Buildings</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
          <select value={fF} onChange={e => setFF(e.target.value)} className={inputCls + ' max-w-[200px]'}><option value="">All Floors</option>{floorsFor(fB).map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}</select>
          <select value={fS} onChange={e => setFS(e.target.value)} className={inputCls + ' max-w-[200px]'}><option value="">All Status</option><option>Available</option><option>Unavailable</option><option>Maintenance</option></select>
        </div>
        {loading ? <p className="text-blue-700">Loading...</p> : <CrudTable cols={['id', 'building', 'floor', 'room_number', 'capacity', 'status']} rows={view} onEdit={openEdit} onDelete={remove} />}
      </Card>
      {show && <Modal title={editId ? 'Edit Room' : 'Add Room'} onClose={() => setShow(false)}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">Building *</label><select required value={form.building_id} onChange={e => setForm({ ...form, building_id: e.target.value, floor_id: '' })} className={inputCls}><option value="">Select</option>{buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}</select></div>
          <div><label className="text-sm font-semibold">Floor *</label><select required value={form.floor_id} onChange={e => setForm({ ...form, floor_id: e.target.value })} className={inputCls}><option value="">Select</option>{floorsFor(form.building_id).map(f => <option key={f.id} value={f.id}>{f.floor_number}</option>)}</select></div>
          <div><label className="text-sm font-semibold">Room Number / Name *</label><input required value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} className={inputCls} placeholder="MB-G01" /></div>
          <div><label className="text-sm font-semibold">Capacity (default {settings.default_capacity || 45})</label><input type="number" min={1} value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className={inputCls} /></div>
          <div><label className="text-sm font-semibold">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputCls}><option>Available</option><option>Unavailable</option><option>Maintenance</option></select></div>
          <div className="flex gap-2 justify-end"><button type="button" onClick={() => setShow(false)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save</button></div>
        </form>
      </Modal>}
    </div>
  );
}
