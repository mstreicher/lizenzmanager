import React, { useState } from 'react';

export default function ApiDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState('licenses-check');

  const endpoints = [
    {
      id: 'licenses-check',
      method: 'GET',
      path: '/licenses/check',
      title: 'Lizenzstatus prüfen',
      description: 'Prüft, ob ein Nutzer Zugriff auf eine bestimmte Lizenz hat',
      parameters: [
        { name: 'user', type: 'string', required: true, description: 'VIDIS-Pseudonym des Nutzers', example: 'pseudo-789abc' },
        { name: 'license', type: 'string', required: true, description: 'Eindeutige Lizenz-ID', example: '123e4567-e89b-12d3-a456-426614174000' }
      ],
      example: {
        request: 'GET /api/licenses/check?user=pseudo-789abc&license=123e4567-e89b-12d3-a456-426614174000',
        response: {
          success: true,
          has_license: true,
          license: {
            id: "123e4567-e89b-12d3-a456-426614174000",
            title: "Mathematik Klasse 9",
            type: "klassenlizenz",
            valid_until: "2024-12-31"
          }
        }
      }
    },
    {
      id: 'licenses-user',
      method: 'GET',
      path: '/licenses/user/{vidis_pseudonym}',
      title: 'Alle Nutzer-Lizenzen',
      description: 'Ruft alle verfügbaren Lizenzen für einen Nutzer ab',
      parameters: [
        { name: 'vidis_pseudonym', type: 'string', required: true, description: 'VIDIS-Pseudonym des Nutzers', example: 'pseudo-789abc' }
      ],
      example: {
        request: 'GET /api/licenses/user/pseudo-789abc',
        response: {
          success: true,
          total: 2,
          licenses: [
            {
              id: "123e4567-e89b-12d3-a456-426614174000",
              title: "Mathematik Klasse 9",
              type: "klassenlizenz",
              subject: "Mathematik"
            }
          ]
        }
      }
    },
    {
      id: 'sso-redirect',
      method: 'GET',
      path: '/sso/redirect',
      title: 'SSO-Weiterleitung',
      description: 'Generiert eine sichere SSO-Weiterleitung zu lizenziertem Inhalt',
      parameters: [
        { name: 'license_id', type: 'string', required: true, description: 'ID der Lizenz', example: '123e4567-e89b-12d3-a456-426614174000' },
        { name: 'user', type: 'string', required: true, description: 'VIDIS-Pseudonym', example: 'pseudo-789abc' },
        { name: 'return_url', type: 'string', required: false, description: 'Rücksprung-URL', example: 'https://lms.schule.de' }
      ],
      example: {
        request: 'GET /api/sso/redirect?license_id=123e4567&user=pseudo-789abc',
        response: 'HTTP 302 Redirect zu lizenziertem Inhalt'
      }
    },
    {
      id: 'anbieter-register',
      method: 'POST',
      path: '/anbieter/register',
      title: 'Anbieter registrieren',
      description: 'Registriert einen neuen Lizenzanbieter im System',
      parameters: [],
      requestBody: {
        company_name: "Bildungsverlag GmbH",
        address: "Musterstraße 123\n12345 Musterstadt",
        contact_email: "kontakt@bildungsverlag.de",
        specialization: "schulbuecher"
      },
      example: {
        request: 'POST /api/anbieter/register',
        response: {
          success: true,
          message: "Provider registration submitted successfully",
          provider_id: "789e0123-e89b-12d3-a456-426614174002",
          api_key: "lc_abc123def456ghi789",
          verification_status: "pending"
        }
      }
    }
  ];

  const currentEndpoint = endpoints.find(e => e.id === activeEndpoint);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="mb-4 text-center">
            <h1 className="display-6 mb-2">🔌 LC-Kern API Dokumentation</h1>
            <p className="text-muted">
              Vollständige API-Referenz für externe LMS-Systeme und Lizenzanbieter
            </p>
          </div>
          
          <div className="alert alert-info mb-4">
            <h5 className="alert-heading">📋 Schnellstart</h5>
            <p className="mb-2">
              <strong>1. API-Schlüssel erhalten:</strong> Registrieren Sie sich als Anbieter über <code>/register</code>
            </p>
            <p className="mb-2">
              <strong>2. Authentifizierung:</strong> Verwenden Sie den API-Schlüssel im Authorization-Header:
            </p>
            <code>Authorization: Bearer lc_your_api_key_here</code>
            <hr />
            <p className="mb-2">
              <strong>🧪 Entwicklung:</strong> Nutzen Sie den Mock-Modus mit <code>VITE_DEVELOPMENT_MODE=true</code>
            </p>
            <p className="mb-0">
              <strong>📄 Vollständige Spezifikation:</strong> <a href="/swagger.yaml" target="_blank" rel="noopener noreferrer">swagger.yaml herunterladen</a>
            </p>
          </div>

          <div className="row">
            <div className="col-md-3">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">API-Endpunkte</h6>
                </div>
                <div className="list-group list-group-flush">
                  {endpoints.map(endpoint => (
                    <button
                      key={endpoint.id}
                      className={`list-group-item list-group-item-action ${activeEndpoint === endpoint.id ? 'active' : ''}`}
                      onClick={() => setActiveEndpoint(endpoint.id)}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <span className={`badge ${endpoint.method === 'GET' ? 'bg-primary' : 'bg-success'} me-2`}>
                            {endpoint.method}
                          </span>
                          <small>{endpoint.title}</small>
                        </div>
                      </div>
                      <small className="text-muted">{endpoint.path}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-md-9">
              {currentEndpoint && (
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <span className={`badge ${currentEndpoint.method === 'GET' ? 'bg-primary' : 'bg-success'} me-2`}>
                        {currentEndpoint.method}
                      </span>
                      {currentEndpoint.path}
                    </h5>
                  </div>
                  <div className="card-body">
                    <p className="card-text">{currentEndpoint.description}</p>

                    {/* Parameters */}
                    {currentEndpoint.parameters.length > 0 && (
                      <div className="mb-4">
                        <h6>Parameter</h6>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Typ</th>
                                <th>Erforderlich</th>
                                <th>Beschreibung</th>
                                <th>Beispiel</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentEndpoint.parameters.map((param, index) => (
                                <tr key={index}>
                                  <td><code>{param.name}</code></td>
                                  <td>{param.type}</td>
                                  <td>{param.required ? '✅' : '❌'}</td>
                                  <td>{param.description}</td>
                                  <td><code>{param.example}</code></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {currentEndpoint.requestBody && (
                      <div className="mb-4">
                        <h6>Request Body</h6>
                        <pre className="bg-light p-3 rounded">
                          <code>{JSON.stringify(currentEndpoint.requestBody, null, 2)}</code>
                        </pre>
                      </div>
                    )}

                    {/* Example */}
                    <div className="mb-4">
                      <h6>Beispiel</h6>
                      <div className="mb-3">
                        <strong>Request:</strong>
                        <pre className="bg-dark text-light p-3 rounded mt-2">
                          <code>{currentEndpoint.example.request}</code>
                        </pre>
                      </div>
                      <div>
                        <strong>Response:</strong>
                        <pre className="bg-light p-3 rounded mt-2">
                          <code>{typeof currentEndpoint.example.response === 'string' 
                            ? currentEndpoint.example.response 
                            : JSON.stringify(currentEndpoint.example.response, null, 2)}</code>
                        </pre>
                      </div>
                    </div>

                    {/* cURL Example */}
                    <div className="mb-4">
                      <h6>cURL Beispiel</h6>
                      <pre className="bg-dark text-light p-3 rounded">
                        <code>
                          {currentEndpoint.method === 'GET' 
                            ? `curl -X GET "http://localhost:5173/api${currentEndpoint.path.replace('{vidis_pseudonym}', 'pseudo-789abc')}${currentEndpoint.parameters.length > 0 && currentEndpoint.method === 'GET' ? '?' + currentEndpoint.parameters.map(p => `${p.name}=${p.example}`).join('&') : ''}" \\
  -H "Authorization: Bearer lc_your_api_key_here"`
                            : `curl -X POST "http://localhost:5173/api${currentEndpoint.path}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer lc_your_api_key_here" \\
  -d '${JSON.stringify(currentEndpoint.requestBody, null, 2)}'`
                          }
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">🔐 Authentifizierung</h5>
              </div>
              <div className="card-body">
                <p>Alle API-Aufrufe (außer Anbieter-Registrierung) erfordern einen gültigen API-Schlüssel:</p>
                <ul>
                  <li><strong>Header:</strong> <code>Authorization: Bearer lc_your_api_key_here</code></li>
                  <li><strong>Format:</strong> <code>lc_</code> gefolgt von 32 Zeichen</li>
                  <li><strong>Erhalt:</strong> Nach Anbieter-Registrierung und Admin-Freigabe</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">📚 Weitere Ressourcen</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Entwicklung</h6>
                    <ul>
                      <li><a href="/swagger.yaml" target="_blank">OpenAPI 3.0 Spezifikation</a></li>
                      <li><a href="https://editor.swagger.io" target="_blank">Online Swagger Editor</a></li>
                      <li><a href="/register">Anbieter-Registrierung</a></li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Integration</h6>
                    <ul>
                      <li>Postman Collection (aus swagger.yaml)</li>
                      <li>Client-Code-Generierung möglich</li>
                      <li>Mock-Modus für Tests verfügbar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
