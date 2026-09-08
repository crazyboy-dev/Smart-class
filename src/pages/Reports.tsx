import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, downloadXLS } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { inputCls } from '../components/Crud';
import { FileSpreadsheet, Printer, MessageCircle } from 'lucide-react';

export default function Reports() {
  const [sp] = useSearchParams();
  const [allots, setAllots] = useState<any[]>([]);
  const [aid, setAid] = useState(sp.get('allotment') || '');
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>({});
  const [msg, setMsg] = useState<any>(null);
  useEffect(() => {
    get('/api/allotments').then(a => { setAllots(a); if (!aid && a.length) setAid(String(a[0].id)); }).catch(() => {});
    get('/api/settings').then(setSettings).catch(() => {});
  }, []);
  useEffect(() => { if (aid) get('/api/seating?allotment_id=' + aid).then(setData).catch(() => {}); }, [aid]);

  const ex = data?.exam || {};
  const completeRows = (data?.seating || []).map((s: any) => ({ Exam: ex.exam_code, Subject: ex.subject, Date: ex.exam_date, Time: `${ex.start_time || ''}-${ex.end_time || ''}`, Building: s.building_name, Floor: s.floor_number, Room: s.room_number, Roll: s.roll_number, Department: s.department, Seat: s.seat_no, Staff: ((data?.staff || []).find((x: any) => x.room_id === s.room_id)?.staff_name || '') }));
  const roomGroups: any = {};
  (data?.seating || []).forEach((s: any) => { (roomGroups[s.room_id] = roomGroups[s.room_id] || []).push(s); });
  const roomRows = Object.keys(roomGroups).map(rid => {
    const g = roomGroups[rid];
    const st = (data?.staff || []).find((x: any) => String(x.room_id) === String(rid));
    return { Building: g[0]?.building_name, Floor: g[0]?.floor_number, Room: g[0]?.room_number, Capacity: g[0]?.capacity, Students: g.length, Staff: st?.staff_name || 'Unassigned' };
  });
  const staffRows = (data?.staff || []).map((s: any) => ({ Staff: s.staff_name || '—', Exam: ex.exam_code, Building: s.building_name, Floor: s.floor_number, Room: s.room_number, Duty: s.duty_status }));

  const exportExcel = () => {
    if (!data?.seating?.length) { setMsg({ type: 'error', text: 'Nothing to export' }); return; }
    const hallRows = roomRows.map((rr: any) => ({ Programme: completeRows[0]?.Department || '', Students: completeRows.filter((c: any) => c.Room === rr.Room).map((c: any) => c.Roll).join(', '), Hall: rr.Room, Count: rr.Students }));
    downloadXLS(`allotment-${ex.exam_code || aid}.xls`, [
      { name: 'Hall Notice', rows: hallRows, columns: ['Programme', 'Students', 'Hall', 'Count'] },
      { name: 'Complete Allotment', rows: completeRows, columns: ['Exam', 'Subject', 'Date', 'Time', 'Building', 'Floor', 'Room', 'Roll', 'Department', 'Seat', 'Staff'] },
      { name: 'Room Wise', rows: roomRows, columns: ['Building', 'Floor', 'Room', 'Capacity', 'Students', 'Staff'] },
      { name: 'Student Wise', rows: completeRows, columns: ['Roll', 'Department', 'Exam', 'Subject', 'Building', 'Floor', 'Room', 'Seat'] },
      { name: 'Staff Duty', rows: staffRows, columns: ['Staff', 'Exam', 'Building', 'Floor', 'Room', 'Duty'] },
    ], `Allotment ${ex.exam_code || ''}`);
    setMsg({ type: 'ok', text: 'Excel file downloaded (5 sheets incl. Hall Notice, opens in Excel/LibreOffice)' });
  };

  const printReport = (kind: string) => {
    if (!data?.seating?.length) { setMsg({ type: 'error', text: 'Generate an allotment first — nothing to print yet.' }); return; }
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const college = esc(settings.college_name || 'College');
    const sub = esc(`${settings.report_header || 'OFFICE OF THE CONTROLLER OF EXAMINATIONS'}${settings.academic_year ? ' • ' + settings.academic_year : ''}`);
    const head = `<div style="text-align:center;border-bottom:3px double #1e3a8a;padding-bottom:8px;margin-bottom:10px">`
      + `<div style="font-size:18px;font-weight:800">${college} (AUTONOMOUS)</div>`
      + `<div style="font-size:12px">${sub}</div>`
      + `<div style="font-size:13px;font-weight:700;margin-top:6px">HALL SEATING FOR THE END SEMESTER EXAMINATIONS</div>`
      + `<div style="font-size:12px">DATE OF EXAMINATION: ${esc(ex.exam_date || '')} &nbsp; SESSION: ${esc((ex.start_time || '') + '-' + (ex.end_time || ''))} &nbsp; STATUS: ${esc(data?.allotment?.status || '')}</div>`
      + `<div style="font-size:12px;font-weight:700">[${esc(ex.exam_code || '')}] ${esc(ex.subject || '')} — ${esc(ex.exam_type || '')}</div></div>`;
    let body = '';
    // Official "hall seating" style: one row per hall with grouped roll list,
    // matching the Controller of Examinations notice format.
    const grouped = roomRows.map((rr: any, i: number) => {
      const rolls = completeRows.filter((c: any) => c.Room === rr.Room).map((c: any) => c.Roll).join(', ');
      return { sno: i + 1, programme: completeRows[0]?.Department || '', rolls, hall: rr.Room, count: rr.Students };
    });
    if (kind === 'hall') body = `<table border="1" cellspacing="0" cellpadding="6" width="100%"><tr><th>S.No</th><th>Programme</th><th>List of students registered</th><th>Hall Number</th></tr>${grouped.map((g: any) => `<tr><td>${g.sno}</td><td>${esc(g.programme)}</td><td style="font-size:11px">${esc(g.rolls)} <b>(${g.count})</b></td><td><b>${esc(g.hall)}</b></td></tr>`).join('')}</table><p>Total students: <b>${completeRows.length}</b> • Total halls: <b>${roomRows.length}</b></p>`;
    else if (kind === 'complete') body = `<table border="1" cellspacing="0" cellpadding="5"><tr><th>Roll</th><th>Dept</th><th>Building</th><th>Floor</th><th>Room</th><th>Seat</th><th>Staff</th></tr>${completeRows.map((r: any) => `<tr><td>${r.Roll}</td><td>${r.Department}</td><td>${r.Building}</td><td>${r.Floor}</td><td>${r.Room}</td><td>${r.Seat}</td><td>${r.Staff}</td></tr>`).join('')}</table>`;
    if (kind === 'room') body = `<table border="1" cellspacing="0" cellpadding="5"><tr><th>Building</th><th>Floor</th><th>Room</th><th>Capacity</th><th>Students</th><th>Staff Duty</th></tr>${roomRows.map((r: any) => `<tr><td>${r.Building}</td><td>${r.Floor}</td><td>${r.Room}</td><td>${r.Capacity}</td><td>${r.Students}</td><td>${r.Staff}</td></tr>`).join('')}</table>`;
    if (kind === 'student') body = `<table border="1" cellspacing="0" cellpadding="5"><tr><th>Roll</th><th>Dept</th><th>Room</th><th>Seat</th></tr>${completeRows.map((r: any) => `<tr><td>${r.Roll}</td><td>${r.Department}</td><td>${r.Room}</td><td>${r.Seat}</td></tr>`).join('')}</table>`;
    if (kind === 'staff') body = `<table border="1" cellspacing="0" cellpadding="5"><tr><th>Staff</th><th>Room</th><th>Building</th><th>Duty</th></tr>${staffRows.map((r: any) => `<tr><td>${r.Staff}</td><td>${r.Room}</td><td>${r.Building}</td><td>${r.Duty}</td></tr>`).join('')}</table>`;
    w.document.write(`<html><head><title>${kind} report — ${ex.exam_code}</title></head><body style="font-family:sans-serif">${head}${body}<p><i>Print → Save as PDF to export.</i></p><script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const waText = encodeURIComponent(
    `*${settings.college_name || 'College'} — Exam Hall Allotment*\nExam: ${ex.exam_code} (${ex.subject})\nDate: ${ex.exam_date} | Time: ${ex.start_time || ''}-${ex.end_time || ''}\nTotal Students: ${completeRows.length}\nTotal Rooms: ${roomRows.length}\nStatus: ${data?.allotment?.status || ''}\n\nDetailed seat lists are shared via the Excel/PDF report file.`
  );
  const waLink = `https://wa.me/?text=${waText}`;

  return (
    <div>
      <PageHead title="Reports, Excel, PDF & WhatsApp" sub="4-sheet Excel • print-friendly PDF • WhatsApp summary (text link; files cannot auto-attach)" />
      <Msg msg={msg} />
      <Card className="p-4 mb-4">
        <label className="text-sm font-semibold">Allotment</label>
        <select value={aid} onChange={e => setAid(e.target.value)} className={inputCls + ' max-w-md'}>{allots.map(a => <option key={a.id} value={a.id}>#{a.id} {a.exam?.exam_code} • {a.exam?.subject} ({a.status})</option>)}</select>
      </Card>
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-5">
          <FileSpreadsheet className="text-green-600 mb-2" size={28} />
          <h3 className="font-bold text-blue-900">Excel Export (5 sheets)</h3>
          <p className="text-xs text-slate-500 mb-3">Hall Notice • Complete • Room Wise • Student Wise • Staff Duty. Valid .xls readable by Excel.</p>
          <button onClick={exportExcel} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">Download Excel</button>
        </Card>
        <Card className="p-5">
          <Printer className="text-blue-600 mb-2" size={28} />
          <h3 className="font-bold text-blue-900">PDF / Print Reports</h3>
          <p className="text-xs text-slate-500 mb-3">Print-friendly pages — use Print → Save as PDF.</p>
          <div className="grid grid-cols-2 gap-2">
            {['hall', 'complete', 'room', 'student', 'staff'].map(k => <button key={k} onClick={() => printReport(k)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold capitalize">{k === 'hall' ? 'Hall Notice PDF' : `${k} PDF`}</button>)}
          </div>
        </Card>
        <Card className="p-5">
          <MessageCircle className="text-emerald-600 mb-2" size={28} />
          <h3 className="font-bold text-blue-900">Share on WhatsApp</h3>
          <p className="text-xs text-slate-500 mb-3">Opens WhatsApp with a pre-filled summary (college, exam, date/time, totals, status). Note: WhatsApp links cannot auto-attach local files — attach the Excel/PDF manually in chat.</p>
          <a href={waLink} target="_blank" rel="noreferrer" className="block text-center w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Share on WhatsApp</a>
        </Card>
      </div>
    </div>
  );
}
