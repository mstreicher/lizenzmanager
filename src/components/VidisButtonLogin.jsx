import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../sources/supabaseClient';
import { processVidisProfile } from '../services/oidcConfig';
import { getEnvironmentConfig, logEnvironmentInfo } from '../utils/environmentUtils';

export default function VidisButtonLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const vidisButtonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clean up any URL parameters from VIDIS redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('state') || urlParams.has('session_state')) {
      // Clean up URL but don't process here - let VIDIS Web Component handle it
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Load VIDIS Button Web Component
    const loadVidisScript = async () => {
      try {
        // Check if script is already loaded
        if (document.querySelector('script[src*="vidisLogin.umd.js"]')) {
          setScriptsLoaded(true);
          setTimeout(setupVidisButton, 100);
          return;
        }

        // Load VIDIS Web Component JavaScript (includes all styles)
        const script = document.createElement('script');
        script.src = 'https://repo.vidis.schule/repository/vidis-cdn/latest/vidisLogin.umd.js';
        script.onload = () => {
          setScriptsLoaded(true);
          setTimeout(setupVidisButton, 100);
        };
        script.onerror = () => {
          setError('Fehler beim Laden des VIDIS Web Components');
        };
        document.head.appendChild(script);
      } catch (err) {
        console.error('Error loading VIDIS Web Component:', err);
        setError('Fehler beim Laden des VIDIS Web Components');
      }
    };

    loadVidisScript();
  }, []);

  // Additional effect to ensure loginurl is set when component is ready
  useEffect(() => {
    if (scriptsLoaded && vidisButtonRef.current) {
      // Wait a bit more for the web component to be fully initialized
      const timer = setTimeout(() => {
        setupVidisButton();
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [scriptsLoaded]);

  const setupVidisButton = () => {
    if (vidisButtonRef.current && scriptsLoaded) {
      const vidisButton = vidisButtonRef.current;
      
      // Get environment-specific configuration
      const envConfig = getEnvironmentConfig();
      
      // Log environment info for debugging
      logEnvironmentInfo();
      
      // Create authorization URL with proper encoding
      const authUrl = new URL('https://aai-test.vidis.schule/auth/realms/vidis/protocol/openid-connect/auth');
      authUrl.searchParams.set('client_id', envConfig.vidis.clientId);
      authUrl.searchParams.set('redirect_uri', envConfig.vidis.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      // Kein scope Parameter - VIDIS verwendet automatisch Standard-Scopes
      
      console.log('🔗 VIDIS Authorization URL:', authUrl.toString());
      
      // Set the login URL - try multiple times to ensure it's set
      const setLoginUrl = () => {
        if (vidisButton && typeof vidisButton.setAttribute === 'function') {
          vidisButton.setAttribute('loginurl', authUrl.toString());
          console.log('✅ VIDIS loginurl set:', vidisButton.getAttribute('loginurl'));
          return true;
        }
        return false;
      };
      
      // Try to set immediately
      if (!setLoginUrl()) {
        // If it fails, try again after a short delay
        setTimeout(() => {
          if (!setLoginUrl()) {
            console.error('❌ Failed to set VIDIS loginurl');
          }
        }, 500);
      }
      
      // Add event listeners for VIDIS button
      vidisButton.addEventListener('vidis-login-success', handleVidisSuccess);
      vidisButton.addEventListener('vidis-login-error', handleVidisError);
      vidisButton.addEventListener('vidis-login-cancelled', handleVidisCancelled);
    } else {
      console.warn('⚠️ VIDIS button not ready:', { 
        buttonRef: !!vidisButtonRef.current, 
        scriptsLoaded 
      });
    }
  };

  const handleVidisSuccess = async (event) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('VIDIS Login Success:', event.detail);
      await processVidisLogin(event.detail);
    } catch (err) {
      console.error('VIDIS login processing error:', err);
      setError('Fehler bei der VIDIS-Authentifizierung: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVidisError = (event) => {
    console.error('VIDIS Login Error:', event.detail);
    setError('VIDIS-Anmeldung fehlgeschlagen: ' + (event.detail?.message || 'Unbekannter Fehler'));
    setLoading(false);
  };

  const handleVidisCancelled = (event) => {
    console.log('VIDIS Login Cancelled:', event.detail);
    setLoading(false);
  };

  const handleAuthorizationCode = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Processing authorization code:', code);
      
      // CORS-Problem: Direkter Token-Austausch nicht möglich von GitHub Pages
      // Stattdessen verwenden wir das VIDIS Web Component für den Token-Austausch
      setError('CORS-Problem erkannt. Bitte verwenden Sie den VIDIS-Button für die Anmeldung.');
      
    } catch (err) {
      console.error('Authorization code processing error:', err);
      setError('Fehler bei der Token-Verarbeitung: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const processVidisLogin = async (vidisData) => {
    console.log('Processing VIDIS data:', vidisData);

    // Process VIDIS profile data
    const processedProfile = processVidisProfile(vidisData);
    
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

      console.log('Attempting to create user with role:', processedProfile.role);
      console.log('Full processed profile:', processedProfile);
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: processedProfile.email,
          vidis_pseudonym: processedProfile.vidis_pseudonym,
          role: 'teacher', // Test mit 'teacher' statt 'lehrer'
          school_id: schoolId,
          name: processedProfile.name,
        })
        .select()
        .single();

      if (createError) {
        console.error('Database error details:', createError);
        console.error('Attempted role value:', processedProfile.role);
        throw createError;
      }
      user = newUser;
    }

    // Create Supabase session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: 'vidis-auth-' + user.vidis_pseudonym,
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
  };

  return (
    <div className="card shadow-sm mb-4" style={{ maxWidth: '800px', width: '100%' }}>
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

        {loading && (
          <div className="text-center mb-3">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span>Verarbeitung läuft...</span>
          </div>
        )}

        {/* VIDIS Button Web Component */}
        <div className="text-center">
          <vidis-login 
            ref={vidisButtonRef}
            size="M"
            cookie="true"
            idpdatafile="idps-test"
            idphintname="vidis_idp_hint"
          />
        </div>

        <div className="mt-3 p-2 bg-info bg-opacity-10 rounded">
          <small className="text-info">
            <strong>Offizieller VIDIS-Button:</strong> Verbindung zu aai-test.vidis.schule
          </small>
        </div>
      </div>
    </div>
  );
}
