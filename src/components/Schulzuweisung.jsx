import React, { useState, useEffect } from 'react';
import { supabase } from '../../sources/supabaseClient';

export default function Schulzuweisung({ lizenzId }) {
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [menge, setMenge] = useState(1);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const loadSchools = async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name');

      if (error) {
        console.error('Fehler beim Laden der Schulen:', error.message);
        setStatus({ type: 'error', msg: 'Fehler beim Laden der Schulen' });
      } else {
        setSchools(data || []);
      }
    };

    loadSchools();
  }, []);

  const handleZuweisen = async () => {
    if (!schoolId || !menge || isNaN(menge) || menge < 1) {
      setStatus({ type: 'error', msg: 'Bitte Schule und gültige Menge angeben' });
      return;
    }

    // Schritt 1: school_license speichern + ID abrufen
    const { data: schoolLicense, error } = await supabase
      .from('school_licenses')
      .insert({
        license_id: lizenzId,
        school_id: schoolId,
        quantity: parseInt(menge)
      })
      .select()
      .single();

    if (error) {
      console.error('Fehler beim Speichern:', error.message);
      setStatus({ type: 'error', msg: 'Zuweisung fehlgeschlagen: ' + error.message });
      return;
    }

    // Schritt 2: passende assignments erzeugen
    const school_license_id = schoolLicense.id;
    const assignmentsPayload = Array.from({ length: menge }).map(() => ({
      school_license_id,
      assigned_to: null
    }));

    const { error: assignError } = await supabase
      .from('assignments')
      .insert(assignmentsPayload);

    if (assignError) {
      console.error('Fehler bei assignments:', assignError.message);
      setStatus({ type: 'error', msg: 'Platzreservierung fehlgeschlagen: ' + assignError.message });
      return;
    }

    setStatus({
      type: 'success',
      msg: `✔️ Lizenz wurde erfolgreich der Schule zugewiesen (${menge} Plätze reserviert)`
    });

    setSchoolId('');
    setMenge(1);
  };

  return (
    <div className="mt-3 p-3 border rounded bg-light">
      <h6 className="mb-3">🏫 Lizenz an Schule zuweisen</h6>

      <div className="row g-2">
        <div className="col-md-6">
          <select
            className="form-select"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
          >
            <option value="">– Schule wählen –</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <input
            type="number"
            className="form-control"
            min={1}
            placeholder="Menge"
            value={menge}
            onChange={(e) => setMenge(e.target.value)}
          />
        </div>
        <div className="col-md-2 d-grid">
          <button className="btn btn-primary" onClick={handleZuweisen}>
            Zuweisen
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`alert mt-3 ${status.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          role="alert"
        >
          {status.msg}
        </div>
      )}
    </div>
  );
}
