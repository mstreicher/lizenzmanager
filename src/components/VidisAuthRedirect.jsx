import React, { useEffect } from 'react';
import { getEnvironmentConfig } from '../utils/environmentUtils';

export default function VidisAuthRedirect() {
  useEffect(() => {
    const redirectToVidis = () => {
      // Get environment-specific configuration
      const envConfig = getEnvironmentConfig();
      
      // Create VIDIS authorization URL with minimal parameters
      // Da der VIDIS-Client nur Authorization Code Flow unterstützt, aber Implicit Flow deaktiviert ist,
      // verwenden wir response_type=code ohne scope Parameter
      const authUrl = new URL('https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/auth');
      authUrl.searchParams.set('client_id', envConfig.vidis.clientId);
      authUrl.searchParams.set('redirect_uri', envConfig.vidis.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      // Kein scope Parameter - VIDIS verwendet automatisch Standard-Scopes
      
      console.log('🔗 Redirecting to VIDIS:', authUrl.toString());
      
      // Redirect to VIDIS
      window.location.href = authUrl.toString();
    };

    // Small delay to show loading state
    const timer = setTimeout(redirectToVidis, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="container d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="card-body text-center">
          <h5 className="card-title mb-4">
            🔄 Weiterleitung zu VIDIS
          </h5>
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">
            Sie werden zu VIDIS weitergeleitet...
          </p>
          <div className="mt-3">
            <small className="text-info">
              Authorization Code Flow wird verwendet
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
