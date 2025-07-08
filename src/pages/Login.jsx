import React, { useState } from 'react';
import { supabase } from '../../sources/supabaseClient';
import { useNavigate } from 'react-router-dom';
import VidisButtonLogin from '../components/VidisButtonLogin';
import EnvironmentDebug from '../components/EnvironmentDebug';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showTraditionalLogin, setShowTraditionalLogin] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return alert(error.message);

    const { data: userInfo } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    switch (userInfo?.role) {
      case 'anbieter': navigate('/anbieter'); break;
      case 'schulleiter': navigate('/schule'); break;
      case 'admin': navigate('/admin'); break;
      default: alert('Unbekannte Rolle.');
    }
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="mb-4 text-center">
        <h1 className="display-6 mb-2">🎓 LC-Kern</h1>
        <p className="text-muted">Universeller Lizenzvermittlungsdienst</p>
      </div>

      {/* VIDIS Login (Primary) */}
      <VidisButtonLogin />

      {/* Environment Debug Info (temporär für Debugging) */}
      <EnvironmentDebug />

      {/* Traditional Login (Secondary) */}
      {!showTraditionalLogin ? (
        <div className="text-center">
          <button 
            className="btn btn-link text-muted"
            onClick={() => setShowTraditionalLogin(true)}
          >
            Alternative Anmeldung (E-Mail/Passwort)
          </button>
        </div>
      ) : (
        <div className="card shadow-sm" style={{ maxWidth: '800px', width: '100%' }}>
          <div className="card-body">
            <h5 className="card-title text-center mb-4">📧 E-Mail Login</h5>
            <div className="mb-3">
              <label className="form-label">E-Mail</label>
              <input 
                className="form-control" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Passwort</label>
              <input 
                className="form-control" 
                type="password" 
                value={pass} 
                onChange={e => setPass(e.target.value)} 
              />
            </div>
            <button className="btn btn-secondary w-100 mb-2" onClick={handleLogin}>
              Anmelden
            </button>
            <button 
              className="btn btn-link w-100 text-muted"
              onClick={() => setShowTraditionalLogin(false)}
            >
              Zurück zu VIDIS-Anmeldung
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-center">
        <small className="text-muted">
          Neu als Anbieter? <a href="/register" className="text-decoration-none">Hier registrieren</a>
          <br />
          Entwickler? <a href="/api-docs" className="text-decoration-none">API-Dokumentation</a>
        </small>
      </div>
    </div>
  );
}
