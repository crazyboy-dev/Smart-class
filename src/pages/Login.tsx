import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { post } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { admin, login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (admin) return <Navigate to="/" replace />;
  const submit = async (e: any) => {
    e.preventDefault();
    setErr('');
    if (!username || !password) { setErr('Username and password required'); return; }
    setBusy(true);
    try {
      const r = await post('/api/auth-login', { username, password });
      login(r.admin);
      nav('/');
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/avs-logo.webp" alt="AVS College of Arts and Science logo" className="w-20 h-20 rounded-full object-contain bg-white border-2 border-blue-100 shadow-md mb-3" />
          <h1 className="text-lg font-extrabold text-blue-900 text-center leading-tight">AVS College of Arts and Science</h1>
          <h2 className="text-base font-bold text-blue-700 text-center mt-1">Smart Exam Hall Allotment<br />& Seating Management</h2>
          <p className="text-sm text-slate-500 mt-1">Examination Cell • Admin Login</p>
        </div>
        {err && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{err}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter admin username" autoComplete="username" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <div className="relative mt-1">
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full border rounded-lg px-3 py-2.5 pr-11 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter password" autoComplete="current-password" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </div>
          <button disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg">{busy ? 'Signing in...' : 'Login'}</button>
        </form>
      </div>
    </div>
  );
}
