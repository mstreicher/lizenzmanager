import React from 'react';
import { useNavigate } from 'react-router-dom';
import AnbieterRegistrierung from '../components/AnbieterRegistrierung';

export default function Register() {
  const navigate = useNavigate();

  const handleRegistrationComplete = () => {
    // Redirect to login after successful registration
    setTimeout(() => {
      navigate('/');
    }, 3000);
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="mb-4 text-center">
            <h1 className="display-6 mb-2">🎓 LC-Kern</h1>
            <p className="text-muted">Anbieter-Registrierung</p>
          </div>

          <AnbieterRegistrierung onRegistrationComplete={handleRegistrationComplete} />

          <div className="text-center mt-4">
            <button 
              className="btn btn-link text-muted"
              onClick={() => navigate('/')}
            >
              ← Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
