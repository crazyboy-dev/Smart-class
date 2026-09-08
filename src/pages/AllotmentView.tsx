import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, post, put } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { inputCls, btnPrimary, btnGhost } from '../components/Crud';
import { CheckCircle2, XCircle, Printer } from 'lucide-react';

export default function AllotmentView() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [editSeat, setEditSeat] = useState<any>(null);
  const [roomFilter, setRoomFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const d = await get('/api/seating?allotment_id=' + id);
      setData(d);
      const st = await get('/api/staff');
      setStaffList(st);
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  const validate = async () => {
    try {
      const v = await get('/api/allotment-validate?allotment_id=' + id);
      setValidation(v);
      setMsg({ type: v.valid ? 'ok' : 'error', text: v.status + (v.valid ? ' — ready to finalize.' : ` — ${v.critical.length} critical issue(s) block finalization.`) });
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const act = async (action: string) => {
    const labels: any = { finalize: 'finalize this allotment', reopen: 'reopen this finalized allotment', 'save-draft': 'save draft' };
    if (!window.confirm(`Confirm: ${labels[action]}?`)) return;
    setBusy(true);
    try {
      const r = await post('/api/allotment-finalize', { action, allotment_id: Number(id) });
      setMsg({ type: 'ok', text: r.message }); load(); validate();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setBusy(false); }
  };
  const saveSeat = async (e: any) => {
    e.preventDefault();
    try {
      await put('/api/seating', { id: editSeat.id, room_id: Number(editSeat.room_id), seat_no: editSeat.seat_no });
      setEditSeat(null); setMsg({ type: 'ok', text: 'Seating updated — revalidate before finalizing' }); load();
    } catch (err: any) { setMsg({ type: 'error', text: err.message }); }
  };
  const setStaff = async (room_id: number, staff_id: string) => {
    try {
      await post('/api/seating', { action: 'set-staff', allotment_id: Number(id), room_id, staff_id: staff_id ? Number(staff_id) : null });
      setMsg({ type: 'ok', text: 'Staff duty updated — revalidate before finalizing' }); load();
    } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  const removeSeat = async (sid: number) => {
    if (!window.confirm('Remove this student from the allotment?')) return;
    try { await post('/api/seating', { action: 'remove-student', seating_id: sid }); setMsg({ type: 'ok', text: 'Removed — revalidate' }); load(); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };

  if (loading) return <div className="text-blue-700">Loading allotment...</div>;
  if (!data?.allotment) return <div className="text-slate-500">Allotment not found. <Link to="/allotments" className="text-blue-600">Back</Link></div>;
  const a = data.allotment, ex = data.exam || {};
  const isFinal = a.status === 'FINALIZED';
  const seats = (data.seating || []).filter((s: any) => !roomFilter || String(s.room_id) === roomFilter);
  const roomGroups: any = {};
  (data.seating || []).forEach((s: any) => { (roomGroups[s.room_id] = roomGroups[s.room_id] || []).push(s); });
  const staffByRoom: any = {};
  (data.staff || []).forEach((s: any) => { staffByRoom[s.room_id] = s; });

  return (
    <div>
      <PageHead title={`Allotment #${a.id} — ${ex.exam_code || ''}`} sub={`${ex.subject || ''} • ${ex.exam_date || ''} ${ex.start_time || ''}-${ex.end_time || ''} • Status: ${a.status}`} right={<>
        <Link to={`/results?allotment=${a.id}`} className={btnGhost}>Result Views</Link>
        <Link to={`/reports?allotment=${a.id}`} className={btnGhost}>Reports / Export</Link>
      </>} />
      <Msg msg={msg} />
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => act('save-draft')} disabled={busy || isFinal} className={btnGhost + ' disabled:opacity-50'}>Save Draft</button>
          <button onClick={validate} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Validate</button>
          {!isFinal && <button onClick={() => act('finalize')} disabled={busy} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Finalize Allotment</button>}
          {isFinal && <button onClick={() => act('reopen')} disabled={busy} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">Reopen Allotment</button>}
          <span className="text-sm text-slate-500 ml-auto">{data.seating?.length || 0} seated • {Object.keys(roomGroups).length} rooms • format {a.seat_format}</span>
        </div>
        {validation && (
          <div className={`mt-3 rounded-lg border p-4 ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 font-bold">{validation.valid ? <><CheckCircle2 className="text-green-600" /> <span className="text-green-700">ALLOTMENT VALID</span></> : <><XCircle className="text-red-600" /> <span className="text-red-700">ISSUES FOUND</span></>}</div>
            <ul className="mt-2 text-sm space-y-1 max-h-48 overflow-y-auto">
              {validation.issues?.map((i: any, k: number) => <li key={k} className={i.level === 'critical' ? 'text-red-700' : 'text-amber-700'}>• [{i.level}] {i.message}</li>)}
              {!validation.issues?.length && <li className="text-green-700">No issues — every check passed.</li>}
            </ul>
          </div>
        )}
      </Card>
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">Staff Duty (one staff = one room)</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.keys(roomGroups).map(rid => {
              const g = roomGroups[rid];
              const cur = staffByRoom[Number(rid)];
              return (
                <div key={rid} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1.5">
                  <span className="font-semibold min-w-[110px]">{g[0]?.room_number} <span className="text-slate-400 font-normal">({g.length})</span></span>
                  <select value={cur?.staff_id || ''} disabled={isFinal} onChange={e => setStaff(Number(rid), e.target.value)} className={inputCls + ' disabled:opacity-60'}>
                    <option value="">— No invigilator —</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.availability})</option>)}
                  </select>
                </div>
              );
            })}
            {!Object.keys(roomGroups).length && <p className="text-sm text-slate-400">No rooms seated.</p>}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-blue-900 mb-2">Department Mixing Check</h3>
          {Object.keys(roomGroups).map(rid => {
            const g = roomGroups[rid];
            const mix: any = {};
            g.forEach((s: any) => { mix[s.department || '—'] = (mix[s.department || '—'] || 0) + 1; });
            return <div key={rid} className="text-sm border-b py-1.5"><b>{g[0]?.room_number}</b> <span className="text-slate-500">({g.length}/{g[0]?.capacity})</span><br /><span className="text-xs">{Object.entries(mix).map(([k, v]) => `${k}: ${v}`).join(' • ')}</span></div>;
          })}
        </Card>
      </div>
      <Card className="p-4">
        <div className="flex gap-2 mb-3 items-center flex-wrap">
          <h3 className="font-bold text-blue-900">Manual Editing (student • room • seat)</h3>
          <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className={inputCls + ' max-w-[220px] ml-auto'}><option value="">All Rooms</option>{Object.keys(roomGroups).map(rid => <option key={rid} value={rid}>{roomGroups[rid][0]?.room_number}</option>)}</select>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto"><table className="w-full text-sm">
          <thead className="sticky top-0 bg-blue-50"><tr><th className="text-left px-3 py-2">Roll</th><th className="text-left px-3 py-2">Student</th><th className="text-left px-3 py-2">Dept</th><th className="text-left px-3 py-2">Building</th><th className="text-left px-3 py-2">Floor</th><th className="text-left px-3 py-2">Room</th><th className="text-left px-3 py-2">Seat</th><th className="px-3 py-2">Edit</th></tr></thead>
          <tbody>{seats.map((s: any) => (
            <tr key={s.id} className="border-t hover:bg-slate-50">
              <td className="px-3 py-1.5 font-semibold">{s.roll_number}</td><td className="px-3 py-1.5">{s.student_name}</td><td className="px-3 py-1.5">{s.department}</td>
              <td className="px-3 py-1.5">{s.building_name}</td><td className="px-3 py-1.5">{s.floor_number}</td><td className="px-3 py-1.5">{s.room_number}</td><td className="px-3 py-1.5 font-mono">{s.seat_no}</td>
              <td className="px-3 py-1.5 whitespace-nowrap">
                {!isFinal && <><button onClick={() => setEditSeat({ ...s })} className="text-blue-600 text-xs font-semibold mr-1">Edit</button><button onClick={() => removeSeat(s.id)} className="text-red-600 text-xs font-semibold">Remove</button></>}
                {isFinal && <span className="text-xs text-slate-400">Locked</span>}
              </td>
            </tr>))}
          </tbody></table></div>
        {editSeat && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditSeat(null)}>
            <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-blue-900 mb-3">Edit Seat — {editSeat.roll_number}</h3>
              <form onSubmit={saveSeat} className="space-y-3">
                <div><label className="text-sm font-semibold">Room</label><select value={editSeat.room_id} onChange={e => setEditSeat({ ...editSeat, room_id: e.target.value })} className={inputCls}>{(data.rooms || []).map((r: any) => <option key={r.id} value={r.id}>{r.room_number} (cap {r.capacity}, {r.status})</option>)}</select></div>
                <div><label className="text-sm font-semibold">Seat</label><input value={editSeat.seat_no} onChange={e => setEditSeat({ ...editSeat, seat_no: e.target.value })} className={inputCls} /></div>
                <div className="flex gap-2 justify-end"><button type="button" onClick={() => setEditSeat(null)} className={btnGhost}>Cancel</button><button className={btnPrimary}>Save & Revalidate</button></div>
              </form>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
