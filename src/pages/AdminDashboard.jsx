import React, { useEffect, useState } from 'react';
import { supabase } from '../../sources/supabaseClient';
import { exportToCsv } from '../utils/exportToCsv';
import AnbieterVerifikation from '../components/AnbieterVerifikation';

export default function AdminDashboard() {
  const [counts, setCounts] = useState({});
  const [subjects, setSubjects] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [licenses, setLicenses] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      const [usersRes, schoolsRes, licensesRes, assignmentsRes] = await Promise.all([
        supabase.from('users').select('id, email, role, school_id'),
        supabase.from('schools').select('id, name, location'),
        supabase.from('licenses').select('id, title, subject, type, valid_until, created_by'),
        supabase.from('assignments').select('id, school_license_id, assigned_to, assigned_at')
      ]);

      const bySubject = {};
      licensesRes.data?.forEach((l) => {
        const s = l.subject || 'unspezifiziert';
        bySubject[s] = (bySubject[s] || 0) + 1;
      });

      setUsers(usersRes.data || []);
      setSchools(schoolsRes.data || []);
      setLicenses(licensesRes.data || []);
      setAssignments(assignmentsRes.data || []);
      setSubjects(bySubject);
      setCounts({
        users: usersRes.data?.length || 0,
        schools: schoolsRes.data?.length || 0,
        licenses: licensesRes.data?.length || 0,
        assignments: assignmentsRes.data?.length || 0
      });
    };

    loadStats();
  }, []);

  const handleExportAssignments = () => {
    if (!assignments.length) return alert('Keine Zuweisungen vorhanden');
    const rows = assignments.map((a) => ({
      Zugewiesen_an: a.assigned_to,
      Datum: a.assigned_at,
      LizenzReferenz: a.school_license_id
    }));
    exportToCsv(rows, 'admin-zuweisungen.csv');
  };

  const handleExportUsers = () => {
    if (!users.length) return alert('Keine Nutzer vorhanden');
    const rows = users.map((u) => ({
      EMail: u.email,
      Rolle: u.role,
      Schule: u.school_id
    }));
    exportToCsv(rows, 'admin-nutzer.csv');
  };

  const handleExportLicenses = () => {
    if (!licenses.length) return alert('Keine Lizenzen vorhanden');
    const rows = licenses.map((l) => ({
      Titel: l.title,
      Fach: l.subject,
      Typ: l.type,
      Gültig_bis: l.valid_until
    }));
    exportToCsv(rows, 'admin-lizenzen.csv');
  };

  return (
    <div className="container">
      <h2 className="mb-4">🛠️ Admin-Dashboard</h2>

      {/* Exportbuttons */}
      <div className="mb-4 d-flex flex-wrap gap-3">
        <button className="btn btn-primary" onClick={handleExportAssignments}>📤 Zuweisungen exportieren</button>
        <button className="btn btn-primary" onClick={handleExportUsers}>📤 Nutzer exportieren</button>
        <button className="btn btn-primary" onClick={handleExportLicenses}>📤 Lizenzen exportieren</button>
      </div>

      {/* Kennzahlen */}
      <div className="card mb-4">
        <h5 className="mb-3">📈 Gesamtstatistik</h5>
        <ul className="list-group">
          <li className="list-group-item d-flex justify-content-between"><span>👥 Nutzer</span><span>{counts.users}</span></li>
          <li className="list-group-item d-flex justify-content-between"><span>🏫 Schulen</span><span>{counts.schools}</span></li>
          <li className="list-group-item d-flex justify-content-between"><span>📚 Lizenzen</span><span>{counts.licenses}</span></li>
          <li className="list-group-item d-flex justify-content-between"><span>📋 Zuweisungen</span><span>{counts.assignments}</span></li>
        </ul>
      </div>

      {/* Lizenzen nach Fach */}
      <div className="card mb-4">
        <h5 className="mb-3">📊 Lizenzen nach Fach</h5>
        <ul className="list-group">
          {Object.entries(subjects).map(([fach, anzahl]) => (
            <li key={fach} className="list-group-item d-flex justify-content-between">
              <span>{fach}</span>
              <span className="badge bg-primary">{anzahl}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Nutzerliste */}
      <div className="card mb-4">
        <h5 className="mb-3">👤 Nutzerliste</h5>
        <table className="table table-striped table-bordered">
          <thead className="table-light">
            <tr>
              <th>E-Mail</th>
              <th>Rolle</th>
              <th>Schule</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.school_id || '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Schulen */}
      <div className="card mb-4">
        <h5 className="mb-3">🏫 Schulen</h5>
        <ul className="list-group">
          {schools.map(s => (
            <li key={s.id} className="list-group-item">
              {s.name} ({s.location || '–'})
            </li>
          ))}
        </ul>
      </div>

      {/* Lizenzen */}
      <div className="card mb-4">
        <h5 className="mb-3">📚 Lizenzen</h5>
        <ul className="list-group">
          {licenses.map(l => (
            <li key={l.id} className="list-group-item">
              <strong>{l.title}</strong> | {l.subject || '–'} | Typ: {l.type} | Gültig bis: {l.valid_until}
            </li>
          ))}
        </ul>
      </div>

      {/* Anbieter-Verifikation */}
      <div className="card mb-4">
        <div className="card-body">
          <AnbieterVerifikation />
        </div>
      </div>
    </div>
  );
}
