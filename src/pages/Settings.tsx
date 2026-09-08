import { useEffect, useState } from 'react';
import { get, put } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { inputCls, btnPrimary } from '../components/Crud';

export default function Settings() {
  const [form, setForm] = useState<any>({ college_name: '', college_code: '', academic_year: '', default_capacity: 45, exam_duration: 180, seat_format: 'A01', report_header: '' });
  const [msg, setMsg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    get('/api/settings').then(s => { setForm({ ...form, ...s }); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const save = async (e: any) => {
    e.preventDefault();
    try { const r = await put('/api/settings', form); setForm({ ...form, ...r }); setMsg({ type: 'ok', text: 'Settings saved' }); }
    catch (e: any) { setMsg({ type: 'error', text: e.message }); }
  };
  if (loading) return <div className="text-blue-700">Loading settings...</div>;
  return (
    <div>
      <PageHead title="Settings" sub="College profile, defaults and report header" />
      <Msg msg={msg} />
      <Card className="p-6 max-w-2xl">
        <form onSubmit={save} className="space-y-3">
          <div><label className="text-sm font-semibold">College Name</label><input value={form.college_name || ''} onChange={e => setForm({ ...form, college_name: e.target.value })} className={inputCls} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-sm font-semibold">College Code</label><input value={form.college_code || ''} onChange={e => setForm({ ...form, college_code: e.target.value })} className={inputCls} /></div>
            <div><label className="text-sm font-semibold">Academic Year</label><input value={form.academic_year || ''} onChange={e => setForm({ ...form, academic_year: e.target.value })} className={inputCls} placeholder="2026-27" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="text-sm font-semibold">Default Room Capacity</label><input type="number" min={1} value={form.default_capacity ?? 45} onChange={e => setForm({ ...form, default_capacity: e.target.value })} className={inputCls} /></div>
            <div><label className="text-sm font-semibold">Exam Duration (minutes)</label><input type="number" min={30} value={form.exam_duration ?? 180} onChange={e => setForm({ ...form, exam_duration: e.target.value })} className={inputCls} /></div>
          </div>
          <div><label className="text-sm font-semibold">Seat Format</label><select value={form.seat_format || 'A01'} onChange={e => setForm({ ...form, seat_format: e.target.value })} className={inputCls}><option value="A01">A01, A02, A03...</option><option value="NUM">1, 2, 3...</option></select></div>
          <div><label className="text-sm font-semibold">Report Header</label><input value={form.report_header || ''} onChange={e => setForm({ ...form, report_header: e.target.value })} className={inputCls} placeholder="Office of the Examination Cell" /></div>
          <button className={btnPrimary}>Save Settings</button>
        </form>
      </Card>
    </div>
  );
}
