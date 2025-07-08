import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function VidisOpenIdEndpoint() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Verarbeitung der VIDIS-Anfrage...');

  useEffect(() => {
    const processVidisRequest = () => {
      // Log current URL and environment for debugging
      console.log('🌍 Current URL:', window.location.href);
      console.log('🌍 Hostname:', window.location.hostname);
      console.log('🌍 Pathname:', window.location.pathname);
      
      // Log all received parameters for debugging
      const allParams = {};
      for (const [key, value] of searchParams.entries()) {
        allParams[key] = value;
      }
      console.log('🔗 VIDIS OpenID Endpoint received parameters:', allParams);

      // Check for VIDIS IDP hint parameter (vidis_idp_hint from VIDIS Web Component)
      const idpHint = searchParams.get('vidis_idp_hint');

      if (idpHint) {
        console.log('✅ VIDIS IDP Hint detected (vidis_idp_hint):', idpHint);
        setMessage(`VIDIS IDP erkannt: ${idpHint} - Weiterleitung zu VIDIS...`);
        setStatus('redirecting');
        
        // This is a VIDIS request - redirect to actual VIDIS authorization immediately
        const authUrl = new URL('https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/auth');
        authUrl.searchParams.set('client_id', 'lc-kern-client');
        
        // Determine redirect URI based on environment
        const isProduction = window.location.hostname === 'mstreicher.github.io';
        const redirectUri = isProduction 
          ? 'https://mstreicher.github.io/lizenzmanager/auth/callback'
          : `${window.location.protocol}//${window.location.host}/auth/callback`;
        
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('vidis_idp_hint', idpHint);
        // Kein scope Parameter - VIDIS verwendet automatisch Standard-Scopes
        
        console.log('🔗 Redirecting to VIDIS with IDP hint:', authUrl.toString());
        console.log('🔗 Redirect URI:', redirectUri);
        
        // Immediate redirect to VIDIS (no delay)
        window.location.href = authUrl.toString();
        
      } else {
        // No IDP hint - this might be a direct access or error
        console.log('⚠️ No vidis_idp_hint parameter found');
        console.log('⚠️ Available parameters:', Object.keys(allParams));
        setStatus('error');
        setMessage('Kein vidis_idp_hint Parameter gefunden. Bitte verwenden Sie den VIDIS-Button.');
        
        // Redirect back to login after delay
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    processVidisRequest();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '🔄';
      case 'redirecting':
        return '🚀';
      case 'error':
        return '❌';
      default:
        return '🔄';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'text-primary';
      case 'redirecting':
        return 'text-success';
      case 'error':
        return 'text-danger';
      default:
        return 'text-primary';
    }
  };

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="card-body text-center">
          <h5 className="card-title mb-4">
            {getStatusIcon()} VIDIS OpenID Connect Endpoint
          </h5>
          
          {status === 'processing' && (
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          )}
          
          {status === 'redirecting' && (
            <div className="spinner-border text-success mb-3" role="status">
              <span className="visually-hidden">Redirecting...</span>
            </div>
          )}
          
          <p className={`mb-3 ${getStatusColor()}`}>
            {message}
          </p>
          
          {status === 'error' && (
            <div className="mt-3">
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/')}
              >
                Zurück zur Anmeldung
              </button>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-light rounded">
            <small className="text-muted">
              <strong>OpenID Connect Endpoint:</strong><br />
              Dieser Endpoint verarbeitet VIDIS-Anfragen und leitet sie an den korrekten VIDIS-Authorization-Server weiter.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
