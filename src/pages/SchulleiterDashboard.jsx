import React, { useEffect, useState } from 'react';
import { supabase } from '../../sources/supabaseClient';
import { exportToCsv } from '../utils/exportToCsv';

export default function SchulleiterDashboard() {
  const [schoolId, setSchoolId] = useState(null);
  const [schoolLizenzen, setSchoolLizenzen] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [zuweisung, setZuweisung] = useState({});
  const [statistik, setStatistik] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      const session = await supabase.auth.getSession();
      const uid = session.data.session.user.id;

      const { data: userInfo } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', uid)
        .single();

      const school_id = userInfo?.school_id;
      setSchoolId(school_id);

      const { data: lizenzen, error } = await supabase
        .from('school_licenses')
        .select(`
          id,
          quantity,
          license_id,
          school_id,
          licenses (
            id,
            title,
            valid_from,
            valid_until,
            subject,
            grade_level,
            type,
            permission,
            prohibition,
            duty,
            scope
          )
        `)
        .eq('school_id', school_id);

      if (error) {
        console.error('Fehler beim Laden der Lizenzen:', error.message);
        setSchoolLizenzen([]);
      } else {
        setSchoolLizenzen(lizenzen || []);
        fetchAssignments((lizenzen || []).map((l) => l.id));
      }
    };

    const fetchAssignments = async (licenseIds) => {
      const { data } = await supabase
        .from('assignments')
        .select('id, school_license_id, assigned_to, assigned_at');

      const grouped = {};
      const counts = {};

      data.forEach((a) => {
        if (!grouped[a.school_license_id]) grouped[a.school_license_id] = [];
        grouped[a.school_license_id].push(a);
        if (a.assigned_to) {
          counts[a.assigned_to] = (counts[a.assigned_to] || 0) + 1;
        }
      });

      setAssignments(grouped);
      setStatistik(counts);
    };

    fetchAll();
  }, []);

  const parseZuweisung = (input) => {
    const match = input.match(/^(.*?)(?:\s*x\s*(\d+))?$/i);
    const name = match?.[1]?.trim();
    const count = parseInt(match?.[2] || '1');
    return { name, count };
  };

  const handleZuweisung = async (schoolLicenseId) => {
    const rawInput = zuweisung[schoolLicenseId];
    if (!rawInput) return alert('Bitte Klasse oder Lehrkraft angeben');
    const { name, count } = parseZuweisung(rawInput);
    if (!name || count < 1) return alert('Ungültiges Format. Beispiel: "9a x 3"');

    const { data: freie } = await supabase
      .from('assignments')
      .select('id')
      .eq('school_license_id', schoolLicenseId)
      .is('assigned_to', null)
      .limit(count);

    if (!freie || freie.length < count) {
      return alert(`Nur ${freie?.length || 0} freie Plätze verfügbar.`);
    }

    const updates = freie.map((a) =>
      supabase.from('assignments').update({
        assigned_to: name,
        assigned_at: new Date().toISOString()
      }).eq('id', a.id)
    );

    await Promise.all(updates);
    alert(`${count} Lizenz(en) an "${name}" zugewiesen.`);
    setZuweisung({ ...zuweisung, [schoolLicenseId]: '' });
    window.location.reload();
  };

  const handleExport = () => {
    const exportData = [];

    schoolLizenzen.forEach((liz) => {
      const einträge = assignments[liz.id] || [];
      einträge.forEach((a) => {
        exportData.push({
          Lizenz: liz.licenses.title,
          Typ: liz.licenses.type,
          Fach: liz.licenses.subject,
          Jahrgang: liz.licenses.grade_level,
          Zugewiesen_an: a.assigned_to || '–',
          Datum: a.assigned_at || '–',
          Gültig_bis: liz.licenses.valid_until
        });
      });
    });

    exportToCsv(exportData, 'schulleiter-lizenzen.csv');
  };

  return (
    <div className="container">
      <h2 className="mb-4">📘 Schulleiter-Dashboard</h2>

      <button onClick={handleExport} className="btn btn-primary mb-4">
        📤 CSV Export aller Zuweisungen
      </button>

      {schoolLizenzen.length === 0 ? (
        <p className="text-muted">Keine Lizenzen für Ihre Schule vorhanden.</p>
      ) : (
        schoolLizenzen.map((liz) => {
          const vergeben = (assignments[liz.id] || []).filter((a) => a.assigned_to).length;
          return (
            <div key={liz.id} className="card mb-4">
              <h5 className="mb-2">
                {liz.licenses.title}
                <span className="badge bg-secondary ms-2">{liz.licenses.type}</span>
              </h5>
              <p>Fach: {liz.licenses.subject || '–'} | Jahrgang: {liz.licenses.grade_level || '–'}</p>
              <p>Gültig: {liz.licenses.valid_from} – {liz.licenses.valid_until}</p>
              <p>Rechte: ✅ {liz.licenses.permission} | 🚫 {liz.licenses.prohibition} | 📌 {liz.licenses.duty}</p>
              <p>Geltungsbereich: {liz.licenses.scope}</p>
              <p>Vergeben: {vergeben} von {liz.quantity} Plätze</p>

              <div className="row g-2 align-items-center mb-3">
                <div className="col-md-8">
                  <input
                    className="form-control"
                    placeholder='z. B. "9a x 3" oder "Frau Müller"'
                    value={zuweisung[liz.id] || ''}
                    onChange={(e) => setZuweisung({ ...zuweisung, [liz.id]: e.target.value })}
                  />
                </div>
                <div className="col-md-4 d-grid">
                  <button className="btn btn-primary" onClick={() => handleZuweisung(liz.id)}>
                    Zuweisen
                  </button>
                </div>
              </div>

              <div>
                <strong>Zuweisungen:</strong>
                <ul className="list-group list-group-flush">
                  {(assignments[liz.id] || []).map((a, idx) => (
                    <li key={idx} className="list-group-item">
                      {a.assigned_to
                        ? `📌 ${a.assigned_to} (${new Date(a.assigned_at).toLocaleDateString()})`
                        : '🔄 Noch nicht zugewiesen'}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })
      )}

      <div className="card mt-4">
        <h5 className="mb-3">📊 Verteilung nach Klasse / Person</h5>
        {Object.keys(statistik).length === 0 ? (
          <p>Keine Zuweisungen vorhanden.</p>
        ) : (
          <ul className="list-group">
            {Object.entries(statistik).map(([name, count]) => (
              <li key={name} className="list-group-item d-flex justify-content-between">
                <span>{name}</span>
                <span className="badge bg-primary">{count} Lizenz(en)</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
