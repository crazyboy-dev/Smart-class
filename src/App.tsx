import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Shell, ProtectedRoute } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Floors from './pages/Floors';
import Rooms from './pages/Rooms';
import Departments from './pages/Departments';
import Staff from './pages/Staff';
import Students from './pages/Students';
import Exams from './pages/Exams';
import ExamStudents from './pages/ExamStudents';
import CreateAllotment from './pages/CreateAllotment';
import Allotments from './pages/Allotments';
import AllotmentView from './pages/AllotmentView';
import Results from './pages/Results';
import Search from './pages/Search';
import History from './pages/History';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function Guarded({ children }: any) {
  return <ProtectedRoute><Shell>{children}</Shell></ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Guarded><Dashboard /></Guarded>} />
          <Route path="/buildings" element={<Guarded><Buildings /></Guarded>} />
          <Route path="/floors" element={<Guarded><Floors /></Guarded>} />
          <Route path="/rooms" element={<Guarded><Rooms /></Guarded>} />
          <Route path="/departments" element={<Guarded><Departments /></Guarded>} />
          <Route path="/staff" element={<Guarded><Staff /></Guarded>} />
          <Route path="/students" element={<Guarded><Students /></Guarded>} />
          <Route path="/exams" element={<Guarded><Exams /></Guarded>} />
          <Route path="/exam-students" element={<Guarded><ExamStudents /></Guarded>} />
          <Route path="/create-allotment" element={<Guarded><CreateAllotment /></Guarded>} />
          <Route path="/allotments" element={<Guarded><Allotments /></Guarded>} />
          <Route path="/allotment/:id" element={<Guarded><AllotmentView /></Guarded>} />
          <Route path="/results" element={<Guarded><Results /></Guarded>} />
          <Route path="/search" element={<Guarded><Search /></Guarded>} />
          <Route path="/history" element={<Guarded><History /></Guarded>} />
          <Route path="/reports" element={<Guarded><Reports /></Guarded>} />
          <Route path="/settings" element={<Guarded><Settings /></Guarded>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
