import React, { useState, useEffect } from 'react';
import { supabase } from '../../sources/supabaseClient';

export default function AnbieterVerifikation() {
  const [pendingProviders, setPendingProviders] = useState([]);
  const [verifiedProviders, setVerifiedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data: pending, error: pendingError } = await supabase
        .from('anbieter_profile')
        .select(`
          *,
          users (
            id,
            email,
            name,
            created_at
          )
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      const { data: verified, error: verifiedError } = await supabase
        .from('anbieter_profile')
        .select(`
          *,
          users (
            id,
            email,
            name,
            created_at
          )
        `)
        .in('verification_status', ['verified', 'rejected'])
        .order('verified_at', { ascending: false });

      if (pendingError) throw pendingError;
      if (verifiedError) throw verifiedError;

      setPendingProviders(pending || []);
      setVerifiedProviders(verified || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (providerId, status, reason = null) => {
    setActionLoading(prev => ({ ...prev, [providerId]: true }));

    try {
      const { error } = await supabase
        .from('anbieter_profile')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verification_reason: reason,
        })
        .eq('id', providerId);

      if (error) throw error;

      // Refresh the data
      await fetchProviders();
      
      alert(`Anbieter wurde ${status === 'verified' ? 'freigegeben' : 'abgelehnt'}.`);
    } catch (error) {
      console.error('Verification error:', error);
      alert('Fehler bei der Verifikation: ' + error.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const ProviderCard = ({ provider, isPending = false }) => (
    <div className="card mb-3">
      <div className="card-body">
        <div className="row">
          <div className="col-md-8">
            <h6 className="card-title">
              {provider.company_name}
              <span className={`badge ms-2 ${
                provider.verification_status === 'verified' ? 'bg-success' :
                provider.verification_status === 'rejected' ? 'bg-danger' : 'bg-warning'
              }`}>
                {provider.verification_status === 'verified' ? 'Verifiziert' :
                 provider.verification_status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
              </span>
            </h6>
            
            <div className="row g-2 small text-muted">
              <div className="col-md-6">
                <strong>E-Mail:</strong> {provider.users?.email}
              </div>
              <div className="col-md-6">
                <strong>Kontakt:</strong> {provider.contact_email}
              </div>
              <div className="col-md-6">
                <strong>Telefon:</strong> {provider.contact_phone || '–'}
              </div>
              <div className="col-md-6">
                <strong>Website:</strong> {provider.website ? (
                  <a href={provider.website} target="_blank" rel="noopener noreferrer">
                    {provider.website}
                  </a>
                ) : '–'}
              </div>
              <div className="col-12">
                <strong>Adresse:</strong> {provider.address}
              </div>
              <div className="col-md-6">
                <strong>Steuernummer:</strong> {provider.tax_id || '–'}
              </div>
              <div className="col-md-6">
                <strong>USt-ID:</strong> {provider.vat_id || '–'}
              </div>
              <div className="col-md-6">
                <strong>Spezialisierung:</strong> {provider.specialization}
              </div>
              <div className="col-md-6">
                <strong>Registriert:</strong> {new Date(provider.created_at).toLocaleDateString()}
              </div>
              {provider.description && (
                <div className="col-12">
                  <strong>Beschreibung:</strong> {provider.description}
                </div>
              )}
              {provider.verification_reason && (
                <div className="col-12">
                  <strong>Grund:</strong> {provider.verification_reason}
                </div>
              )}
            </div>
          </div>
          
          {isPending && (
            <div className="col-md-4">
              <div className="d-grid gap-2">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleVerification(provider.id, 'verified')}
                  disabled={actionLoading[provider.id]}
                >
                  {actionLoading[provider.id] ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : '✅'} Freigeben
                </button>
                
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    const reason = prompt('Grund für die Ablehnung:');
                    if (reason) {
                      handleVerification(provider.id, 'rejected', reason);
                    }
                  }}
                  disabled={actionLoading[provider.id]}
                >
                  {actionLoading[provider.id] ? (
                    <span className="spinner-border spinner-border-sm me-1" />
                  ) : '❌'} Ablehnen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="mb-4">🏢 Anbieter-Verifikation</h4>

      {/* Pending Verifications */}
      <div className="mb-5">
        <h5 className="mb-3">
          ⏳ Ausstehende Verifikationen 
          <span className="badge bg-warning ms-2">{pendingProviders.length}</span>
        </h5>
        
        {pendingProviders.length === 0 ? (
          <div className="alert alert-info">
            Keine ausstehenden Verifikationen vorhanden.
          </div>
        ) : (
          pendingProviders.map(provider => (
            <ProviderCard 
              key={provider.id} 
              provider={provider} 
              isPending={true}
            />
          ))
        )}
      </div>

      {/* Verified/Rejected Providers */}
      <div>
        <h5 className="mb-3">
          📋 Bearbeitete Anbieter 
          <span className="badge bg-secondary ms-2">{verifiedProviders.length}</span>
        </h5>
        
        {verifiedProviders.length === 0 ? (
          <div className="alert alert-info">
            Noch keine bearbeiteten Anbieter vorhanden.
          </div>
        ) : (
          verifiedProviders.map(provider => (
            <ProviderCard 
              key={provider.id} 
              provider={provider} 
              isPending={false}
            />
          ))
        )}
      </div>
    </div>
  );
}
