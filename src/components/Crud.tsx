import { useEffect, useState } from 'react';
import { get, post, put, del } from '../lib/api';
import { Card, PageHead, Msg } from '../components/Layout';
import { Pencil, Trash2 } from 'lucide-react';

function useCrud(path: string) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<any>(null);
  const fetchRows = async (extra = '') => {
    setLoading(true);
    try { setRows(await get(path + extra)); } catch (e: any) { setMsg({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchRows(); }, []);
  return { rows, loading, msg, setMsg, fetchRows };
}
export { useCrud };

export function CrudTable({ cols, rows, onEdit, onDelete }: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-blue-50 text-blue-900">{cols.map((c: string) => <th key={c} className="text-left px-3 py-2 font-semibold">{c}</th>)}<th className="px-3 py-2">Actions</th></tr></thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-t hover:bg-slate-50">
              {cols.map((c: string) => <td key={c} className="px-3 py-2">{String(r[c] ?? '')}</td>)}
              <td className="px-3 py-2 whitespace-nowrap">
                <button onClick={() => onEdit(r)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Edit"><Pencil size={16} /></button>
                <button onClick={() => { if (window.confirm('Delete this record? This cannot be undone.')) onDelete(r); }} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Delete"><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={cols.length + 1} className="text-center py-6 text-slate-400">No records found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-blue-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export const inputCls = 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none';
export const btnPrimary = 'bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm';
export const btnGhost = 'bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold';
