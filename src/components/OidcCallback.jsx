import React, { useEffect, useState } from 'react';
import { oidcService, processVidisProfile, decodeVidisToken } from '../services/oidcConfig';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../sources/supabaseClient';

export default function OidcCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Verarbeitung der VIDIS-Authentifizierung...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        console.log('🔗 OIDC Callback received:', { code: !!code, state, error });

        if (error) {
          // Handle specific VIDIS errors
          if (error === 'invalid_scope') {
            throw new Error(`VIDIS Scope-Fehler: Nur 'openid' Scope wird unterstützt. Bitte überprüfen Sie die VIDIS-Client-Konfiguration.`);
          }
          throw new Error(`VIDIS Error: ${error}`);
        }

        if (code) {
          // Authorization Code Flow - exchange code for token directly
          console.log('✅ Processing authorization code:', code);
          setStatus('Token-Austausch mit VIDIS...');
          
          // Exchange authorization code for access token
          const tokenResponse = await exchangeCodeForToken(code);
          console.log('✅ Token response received:', tokenResponse);
          
          if (tokenResponse && tokenResponse.access_token) {
            setStatus('Verarbeitung der Benutzerdaten...');
            
            // Extract VIDIS data from access token
            const tokenData = decodeVidisToken(tokenResponse.access_token);
            console.log('✅ VIDIS token data:', tokenData);
            
            if (tokenData) {
              // Process VIDIS profile
              const processedProfile = processVidisProfile(tokenData);
              console.log('✅ Processed VIDIS profile:', processedProfile);
              
              // Process the VIDIS login (same logic as in VidisButtonLogin)
              await processVidisLogin(processedProfile);
            } else {
              throw new Error('Keine VIDIS-Daten im Token gefunden');
            }
          } else {
            throw new Error('Kein Access Token von VIDIS erhalten');
          }
        } else {
          // No code - redirect to login
          console.log('⚠️ No authorization code found, redirecting to login');
          navigate('/');
        }
        
      } catch (err) {
        console.error('OIDC callback error:', err);
        setError('Fehler bei der VIDIS-Authentifizierung: ' + err.message);
        setLoading(false);
      }
    };

    const processVidisLogin = async (processedProfile) => {
      setStatus('Benutzer wird erstellt/aktualisiert...');
      
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
        setStatus('Neue Schule wird erstellt...');
        
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

        setStatus('Neuer Benutzer wird erstellt...');
        console.log('Creating user with role:', processedProfile.role);
        
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: processedProfile.email,
            vidis_pseudonym: processedProfile.vidis_pseudonym,
            role: processedProfile.role, // Use the mapped role from VIDIS
            school_id: schoolId,
            name: processedProfile.name,
          })
          .select()
          .single();

        if (createError) {
          console.error('Database error details:', createError);
          throw createError;
        }
        user = newUser;
      }

      setStatus('Anmeldung wird abgeschlossen...');
      
      // Navigate based on role
      console.log('✅ Navigating user based on role:', user.role);
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
        case 'lehrer':
        case 'teacher':
          navigate('/schule'); // Lehrkräfte gehen zum Schul-Dashboard
          break;
        default:
          navigate('/schule');
      }
    };

    const exchangeCodeForToken = async (code) => {
      try {
        // VIDIS Token Endpoint
        const tokenEndpoint = 'https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/token';
        
        // Determine redirect URI based on environment
        const isProduction = window.location.hostname === 'mstreicher.github.io';
        const redirectUri = isProduction 
          ? 'https://mstreicher.github.io/lizenzmanager/auth/callback'
          : `${window.location.protocol}//${window.location.host}/auth/callback`;
        
        // Prepare token request
        const tokenRequest = new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          client_id: 'lc-kern-client',
          client_secret: 'kCXIpvO7kVrommGAPi6RBenZCocr6fl3', // VIDIS Client Secret
        });

        console.log('🔗 Token request:', {
          endpoint: tokenEndpoint,
          redirect_uri: redirectUri,
          client_id: 'lc-kern-client',
          code: code.substring(0, 10) + '...'
        });

        // Make token request
        const response = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenRequest,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token exchange failed:', response.status, errorText);
          throw new Error(`Token-Austausch fehlgeschlagen: ${response.status} ${response.statusText}`);
        }

        const tokenData = await response.json();
        console.log('✅ Token exchange successful');
        return tokenData;
        
      } catch (error) {
        console.error('Error exchanging code for token:', error);
        throw error;
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
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}
