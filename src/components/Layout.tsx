import { ReactNode } from 'react';
import { Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Layers, DoorOpen, Users, GraduationCap,
  ClipboardList, CalendarCheck, Search, Settings, History, FileBarChart,
  LogOut, Menu, X, Armchair, UserCheck,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/buildings', label: 'Buildings', icon: Building2 },
  { to: '/floors', label: 'Floors', icon: Layers },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/departments', label: 'Departments', icon: Users },
  { to: '/staff', label: 'Staff', icon: UserCheck },
  { to: '/students', label: 'Students', icon: GraduationCap },
  { to: '/exams', label: 'Exams', icon: ClipboardList },
  { to: '/allotments', label: 'Allotments', icon: Armchair },
  { to: '/results', label: 'Result Views', icon: FileBarChart },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-blue-700">Loading...</div>;
  if (!admin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function Shell({ children }: { children: ReactNode }) {
  const { admin, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const doLogout = () => { logout(); nav('/login'); };
  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className={`fixed lg:static z-40 h-screen w-64 bg-gradient-to-b from-blue-900 to-blue-700 text-white flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-white/15 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <img src="/avs-logo.webp" alt="AVS College of Arts and Science logo" className="w-11 h-11 rounded-full bg-white p-0.5 object-contain shrink-0 shadow" />
            <div>
              <div className="font-bold text-[15px] leading-tight">AVS College of Arts and Science</div>
              <div className="text-[10px] text-blue-200 tracking-widest">SMART EXAM HALL • EXAM CELL</div>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map(n => {
            const active = loc.pathname === n.to || (n.to !== '/' && loc.pathname.startsWith(n.to));
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${active ? 'bg-white text-blue-800 font-semibold shadow' : 'text-blue-100 hover:bg-white/10'}`}>
                <Icon size={18} /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/15">
          <div className="text-xs text-blue-200 mb-1">Signed in as</div>
          <div className="font-semibold text-sm mb-3">{admin?.name || admin?.username}</div>
          <button onClick={doLogout} className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm sticky top-0 z-30 px-4 py-2.5 flex items-center gap-3">
          <button className="lg:hidden text-blue-800" onClick={() => setOpen(true)}><Menu size={22} /></button>
          <div className="flex items-center gap-3 min-w-0">
            <img src="/avs-logo.webp" alt="AVS College of Arts and Science logo" className="w-10 h-10 rounded-full object-contain bg-white border border-blue-100 shadow-sm shrink-0" />
            <div className="min-w-0">
              <div className="text-blue-900 font-extrabold text-sm sm:text-base leading-tight truncate">AVS College of Arts and Science</div>
              <div className="text-[11px] sm:text-xs text-slate-500 leading-tight truncate">Smart Exam Hall Allotment & Seating Management <span className="hidden md:inline">• Examination Cell</span></div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/create-allotment" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-semibold">+ Generate Allotment</Link>
          </div>
        </header>
        <main className="p-4 lg:p-6 flex-1">{children}</main>
        <footer className="text-center text-xs text-slate-500 py-4">AVS College of Arts and Science • Smart Exam Hall Allotment & Seating Management System • Examination Cell</footer>
      </div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>{children}</div>;
}
export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold text-blue-900">{title}</h1>
        {sub && <p className="text-sm text-slate-500">{sub}</p>}
      </div>
      <div className="ml-auto flex gap-2 flex-wrap">{right}</div>
    </div>
  );
}
export function Msg({ msg }: { msg: { type: string; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium border ${msg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
      {msg.text}
    </div>
  );
}
