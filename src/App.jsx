import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ApiDocs from './pages/ApiDocs';
import AnbieterDashboard from './pages/AnbieterDashboard';
import SchulleiterDashboard from './pages/SchulleiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import OidcCallback from './components/OidcCallback';
import VidisAuthRedirect from './components/VidisAuthRedirect';

function App() {
  // Get the base name for GitHub Pages
  const basename = import.meta.env.PROD ? '/lizenzmanager' : '';
  
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/auth/callback" element={<OidcCallback />} />
        <Route path="/auth/vidis" element={<VidisAuthRedirect />} />
        <Route path="/anbieter" element={<AnbieterDashboard />} />
        <Route path="/schule" element={<SchulleiterDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
