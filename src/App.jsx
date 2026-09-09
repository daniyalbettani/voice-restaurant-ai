import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
