import React, { useState, useEffect } from 'react';
import { oidcService, processVidisProfile } from '../services/oidcConfig';
import { supabase } from '../../sources/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function VidisLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleVidisLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Start VIDIS OIDC login - redirects to VIDIS
      await oidcService.login();
      // Note: This will redirect to VIDIS, so code after this won't execute
    } catch (err) {
      console.error('VIDIS login error:', err);
      setError('Fehler bei der VIDIS-Anmeldung: ' + err.message);
      setLoading(false);
    }
  };

  const handleVidisCallback = async () => {
    try {
      // Get user from VIDIS
      const vidisUser = await oidcService.getUser();
      
      if (!vidisUser || !vidisUser.profile) {
        throw new Error('Keine VIDIS-Benutzerdaten erhalten');
      }

      // Process VIDIS profile to LC-Kern format
      const processedProfile = processVidisProfile(vidisUser.profile);
      
      console.log('Processed VIDIS profile:', processedProfile);

      // Check if user exists in our system
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('vidis_pseudonym', processedProfile.vidis_pseudonym)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      let user = existingUser;

      // If user doesn't exist, create new user
      if (!existingUser) {
        // Find or create school based on schulkennung
        let schoolId = null;
        if (processedProfile.vidis_schulkennung) {
          const { data: existingSchool } = await supabase
            .from('schools')
            .select('id')
            .eq('external_id', processedProfile.vidis_schulkennung)
            .single();

          if (existingSchool) {
            schoolId = existingSchool.id;
          } else {
            // Create new school
            const { data: newSchool, error: schoolError } = await supabase
              .from('schools')
              .insert({
                name: `Schule ${processedProfile.vidis_schulkennung}`,
                location: processedProfile.vidis_bundesland || 'Deutschland',
                external_id: processedProfile.vidis_schulkennung,
              })
              .select('id')
              .single();

            if (!schoolError && newSchool) {
              schoolId = newSchool.id;
            }
          }
        }

        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: processedProfile.email,
            vidis_pseudonym: processedProfile.vidis_pseudonym,
            role: processedProfile.role,
            school_id: schoolId,
            name: processedProfile.name,
          })
          .select()
          .single();

        if (createError) throw createError;
        user = newUser;
      }

      // Create Supabase session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: 'vidis-auth-' + user.vidis_pseudonym, // Temporary password for VIDIS users
      });

      if (signInError) {
        // If password doesn't work, update user with VIDIS auth
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user.id,
          { password: 'vidis-auth-' + user.vidis_pseudonym }
        );
        
        if (updateError) {
          console.warn('Could not update user password:', updateError);
        }
      }

      // Navigate based on role
      switch (user.role) {
        case 'anbieter':
          navigate('/anbieter');
          break;
        case 'schulleiter':
          navigate('/schule');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/schule');
      }

    } catch (err) {
      console.error('VIDIS callback error:', err);
      setError('Fehler bei der VIDIS-Authentifizierung: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle callback on component mount if we're on the callback URL
  useEffect(() => {
    const handleCallback = async () => {
      if (window.location.pathname === '/auth/callback') {
        setLoading(true);
        await handleVidisCallback();
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="card shadow-sm mb-4" style={{ maxWidth: '400px', width: '100%' }}>
      <div className="card-body">
        <h5 className="card-title text-center mb-4">
          🎓 VIDIS-Anmeldung
        </h5>
        
        <p className="text-muted small text-center mb-4">
          Melden Sie sich mit Ihren VIDIS-Zugangsdaten an, um auf den LC-Kern zuzugreifen.
        </p>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <button
          className="btn btn-primary w-100"
          onClick={handleVidisLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Anmeldung läuft...
            </>
          ) : (
            <>
              🔐 Mit VIDIS anmelden
            </>
          )}
        </button>

        {import.meta.env.VITE_DEVELOPMENT_MODE === 'true' ? (
          <div className="mt-3 p-2 bg-warning bg-opacity-10 rounded">
            <small className="text-warning">
              <strong>Entwicklungsmodus:</strong> VIDIS wird simuliert
            </small>
          </div>
        ) : (
          <div className="mt-3 p-2 bg-info bg-opacity-10 rounded">
            <small className="text-info">
              <strong>VIDIS-Test:</strong> Verbindung zu aai-test.vidis.schule
            </small>
          </div>
        )}
      </div>
    </div>
  );
}
