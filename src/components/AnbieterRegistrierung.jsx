import React, { useState } from 'react';
import { supabase } from '../../sources/supabaseClient';

export default function AnbieterRegistrierung({ onRegistrationComplete }) {
  const [formData, setFormData] = useState({
    company_name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    tax_id: '',
    vat_id: '',
    specialization: '',
    website: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Nicht angemeldet');
      }

      // Create anbieter profile
      const { data, error: insertError } = await supabase
        .from('anbieter_profile')
        .insert({
          user_id: session.user.id,
          ...formData,
          verification_status: 'pending',
          api_key: generateApiKey(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update user role to anbieter
      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'anbieter' })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      if (onRegistrationComplete) {
        onRegistrationComplete(data);
      }

    } catch (err) {
      console.error('Registration error:', err);
      setError('Fehler bei der Registrierung: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    return 'lc_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  if (success) {
    return (
      <div className="card shadow-sm">
        <div className="card-body text-center">
          <h5 className="card-title text-success mb-4">
            ✅ Registrierung erfolgreich
          </h5>
          <p className="text-muted mb-4">
            Ihre Anbieter-Registrierung wurde erfolgreich eingereicht. 
            Ein Administrator wird Ihre Angaben prüfen und Sie freischalten.
          </p>
          <div className="alert alert-info">
            <strong>Nächste Schritte:</strong>
            <ul className="list-unstyled mt-2 mb-0">
              <li>• Warten Sie auf die Freischaltung durch einen Administrator</li>
              <li>• Sie erhalten eine E-Mail-Benachrichtigung bei der Freischaltung</li>
              <li>• Nach der Freischaltung können Sie Lizenzen verwalten</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h5 className="card-title mb-4">
          🏢 Anbieter-Registrierung
        </h5>
        
        <p className="text-muted mb-4">
          Registrieren Sie sich als Lizenzanbieter im LC-Kern System. 
          Nach der Prüfung durch einen Administrator können Sie Lizenzen verwalten.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Firmenname *</label>
              <input
                type="text"
                className="form-control"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Kontakt-E-Mail *</label>
              <input
                type="email"
                className="form-control"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Telefon</label>
              <input
                type="tel"
                className="form-control"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Website</label>
              <input
                type="url"
                className="form-control"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>

            <div className="col-12">
              <label className="form-label">Adresse *</label>
              <textarea
                className="form-control"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Steuernummer</label>
              <input
                type="text"
                className="form-control"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleInputChange}
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Umsatzsteuer-ID</label>
              <input
                type="text"
                className="form-control"
                name="vat_id"
                value={formData.vat_id}
                onChange={handleInputChange}
                placeholder="DE..."
              />
            </div>

            <div className="col-12">
              <label className="form-label">Spezialisierung *</label>
              <select
                className="form-select"
                name="specialization"
                value={formData.specialization}
                onChange={handleInputChange}
                required
              >
                <option value="">Bitte wählen...</option>
                <option value="schulbuecher">Schulbücher</option>
                <option value="software">Lernsoftware</option>
                <option value="medien">Digitale Medien</option>
                <option value="plattformen">Lernplattformen</option>
                <option value="mixed">Gemischt</option>
                <option value="other">Sonstiges</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label">Beschreibung</label>
              <textarea
                className="form-control"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Beschreiben Sie Ihr Unternehmen und Ihre Lizenzprodukte..."
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registrierung läuft...
                </>
              ) : (
                'Registrierung einreichen'
              )}
            </button>
          </div>

          <div className="mt-3">
            <small className="text-muted">
              * Pflichtfelder. Ihre Daten werden vertraulich behandelt und nur für die Lizenzabwicklung verwendet.
            </small>
          </div>
        </form>
      </div>
    </div>
  );
}
