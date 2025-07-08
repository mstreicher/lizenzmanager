import React, { useEffect, useState } from 'react';
import { oidcService } from '../services/oidcConfig';
import { useNavigate } from 'react-router-dom';

export default function OidcCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          // Handle specific VIDIS errors
          if (error === 'invalid_scope') {
            throw new Error(`VIDIS Scope-Fehler: Nur 'openid' Scope wird unterstützt. Bitte überprüfen Sie die VIDIS-Client-Konfiguration.`);
          }
          throw new Error(`VIDIS Error: ${error}`);
        }

        if (!code) {
          throw new Error('Kein Authorization Code erhalten');
        }

        // Handle VIDIS callback manually since we're not using the full OIDC client flow
        console.log('Received authorization code:', code);
        
        // For now, redirect to home page with success
        // The actual token exchange would happen here in a real implementation
        navigate('/?vidis_success=true&code=' + code);
        
      } catch (err) {
        console.error('OIDC callback error:', err);
        setError('Fehler bei der VIDIS-Authentifizierung: ' + err.message);
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="card shadow-sm" style={{ maxWidth: '400px', width: '100%' }}>
          <div className="card-body text-center">
            <h5 className="card-title text-danger mb-4">
              ❌ Authentifizierungsfehler
            </h5>
            <p className="text-muted mb-4">{error}</p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body text-center">
          <h5 className="card-title mb-4">
            🔄 VIDIS-Authentifizierung
          </h5>
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">
            Sie werden authentifiziert und weitergeleitet...
          </p>
        </div>
      </div>
    </div>
  );
}
