export async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
export const get = (p: string) => api(p);
export const post = (p: string, body: any) => api(p, { method: 'POST', body: JSON.stringify(body) });
export const put = (p: string, body: any) => api(p, { method: 'PUT', body: JSON.stringify(body) });
export const del = (p: string, body?: any) => api(p, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });

export function downloadCSV(filename: string, rows: any[], columns?: string[]) {
  const cols = columns || (rows.length ? Object.keys(rows[0]) : []);
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function downloadXLS(filename: string, sheets: { name: string; rows: any[]; columns: string[] }[], title: string) {
  // Excel-compatible multi-sheet .xls via SpreadsheetML (XML) — opens in Excel/LibreOffice
  const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sheetXml = sheets.map(s => {
    const header = s.columns.map(c => `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`).join('');
    const body = s.rows.map(r => `<Row>${s.columns.map(c => `<Cell><Data ss:Type="String">${esc(r[c])}</Data></Cell>`).join('')}</Row>`).join('');
    return `<Worksheet ss:Name="${esc(s.name).slice(0, 31)}"><Table><Row>${header}</Row>${body}</Table></Worksheet>`;
  }).join('');
  const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties><Title>${esc(title)}</Title></DocumentProperties>${sheetXml}</Workbook>`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
