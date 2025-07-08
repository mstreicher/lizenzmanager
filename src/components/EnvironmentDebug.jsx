import React from 'react';
import { getEnvironmentConfig, logEnvironmentInfo } from '../utils/environmentUtils';

export default function EnvironmentDebug() {
  const config = getEnvironmentConfig();
  
  // Log to console for debugging
  React.useEffect(() => {
    logEnvironmentInfo();
  }, []);

  return (
    <div className="card mt-3" style={{ maxWidth: '800px', width: '100%' }}>
      <div className="card-header">
        <h6 className="mb-0">🔍 Environment Debug Info</h6>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <h6>Current Environment:</h6>
            <p className={`badge ${config.isDevelopment ? 'bg-warning' : 'bg-success'}`}>
              {config.environment}
            </p>
            
            <h6 className="mt-3">URLs:</h6>
            <ul className="list-unstyled small">
              <li><strong>Base URL:</strong> {config.baseUrl}</li>
              <li><strong>VIDIS Redirect:</strong> {config.vidisRedirectUri}</li>
            </ul>
          </div>
          
          <div className="col-md-6">
            <h6>Browser Info:</h6>
            <ul className="list-unstyled small">
              <li><strong>Hostname:</strong> {window.location.hostname}</li>
              <li><strong>Origin:</strong> {window.location.origin}</li>
              <li><strong>Pathname:</strong> {window.location.pathname}</li>
              <li><strong>Protocol:</strong> {window.location.protocol}</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-3">
          <h6>VIDIS Configuration:</h6>
          <div className="bg-light p-2 rounded">
            <small>
              <strong>Client ID:</strong> {config.vidis.clientId}<br/>
              <strong>Redirect URI:</strong> {config.vidis.redirectUri}<br/>
              <strong>Scope:</strong> {config.vidis.scope}
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
