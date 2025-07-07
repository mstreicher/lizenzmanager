import React, { useEffect, useState } from 'react';
import { supabase } from '../../sources/supabaseClient';
import Schulzuweisung from '../components/Schulzuweisung';
import { exportToCsv } from '../utils/exportToCsv';

export default function AnbieterDashboard() {
  const [userId, setUserId] = useState(null);
  const [lizenzen, setLizenzen] = useState([]);
  const [neu, setNeu] = useState({
    title: '',
    type: 'einzellizenz',
    valid_from: '',
    valid_until: '',
    permission: 'use',
    prohibition: 'commercialUse',
    duty: 'attribution',
    scope: 'schule',
    subject: '',
    grade_level: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const session = await supabase.auth.getSession();
      const uid = session.data.session.user.id;
      setUserId(uid);
      fetchLizenzen(uid);
    };
    fetchData();
  }, []);

  const fetchLizenzen = async (uid) => {
    const { data } = await supabase
      .from('licenses')
      .select('*')
      .eq('created_by', uid)
      .order('valid_until', { ascending: false });
    setLizenzen(data || []);
  };

  const handleCreate = async () => {
    const { error } = await supabase.from('licenses').insert({
      ...neu,
      created_by: userId
    });
    if (error) return alert(error.message);
    setNeu({ ...neu, title: '', valid_from: '', valid_until: '', subject: '', grade_level: '' });
    fetchLizenzen(userId);
  };

  const handleExport = () => {
    if (lizenzen.length > 0) exportToCsv(lizenzen, 'anbieter-lizenzen.csv');
    else alert('Keine Lizenzen vorhanden.');
  };

  return (
    <div className="container">
      <h2 className="mb-4">🎓 Anbieter-Dashboard</h2>

      {/* Lizenz anlegen */}
      <div className="card mb-4">
        <h4 className="mb-3">➕ Neue Lizenz anlegen</h4>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Titel</label>
            <input className="form-control" value={neu.title} onChange={(e) => setNeu({ ...neu, title: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Typ</label>
            <select className="form-select" value={neu.type} onChange={(e) => setNeu({ ...neu, type: e.target.value })}>
              <option value="einzellizenz">Einzellizenz</option>
              <option value="klassenlizenz">Klassenlizenz</option>
              <option value="schullizenz">Schullizenz</option>
              <option value="landeslizenz">Landeslizenz</option>
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Gültig von</label>
            <input type="date" className="form-control" value={neu.valid_from} onChange={(e) => setNeu({ ...neu, valid_from: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Gültig bis</label>
            <input type="date" className="form-control" value={neu.valid_until} onChange={(e) => setNeu({ ...neu, valid_until: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Fach</label>
            <input className="form-control" value={neu.subject} onChange={(e) => setNeu({ ...neu, subject: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Jahrgang</label>
            <input className="form-control" value={neu.grade_level} onChange={(e) => setNeu({ ...neu, grade_level: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Erlaubnis (ODRL)</label>
            <input className="form-control" value={neu.permission} onChange={(e) => setNeu({ ...neu, permission: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Verbot (ODRL)</label>
            <input className="form-control" value={neu.prohibition} onChange={(e) => setNeu({ ...neu, prohibition: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Pflicht (ODRL)</label>
            <input className="form-control" value={neu.duty} onChange={(e) => setNeu({ ...neu, duty: e.target.value })} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Geltungsbereich</label>
            <input className="form-control" value={neu.scope} onChange={(e) => setNeu({ ...neu, scope: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary mt-4 w-100" onClick={handleCreate}>✔️ Lizenz erstellen</button>
      </div>

      {/* Lizenzübersicht */}
      <div className="card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4>📚 Vergebene Lizenzen</h4>
          <button className="btn btn-sm btn-primary" onClick={handleExport}>📤 Export</button>
        </div>
        {lizenzen.length === 0 ? (
          <p>Keine Lizenzen vorhanden.</p>
        ) : (
          lizenzen.map((l) => (
            <div key={l.id} className="border-bottom pb-3 mb-3">
              <h5>{l.title} <span className="badge bg-secondary ms-2">{l.type}</span></h5>
              <p className="mb-1">Gültig: {l.valid_from} – {l.valid_until}</p>
              <p className="mb-1">Fach: {l.subject || '–'} | Jahrgang: {l.grade_level || '–'}</p>
              <p className="mb-1">
                Rechte: ✅ {l.permission} | 🚫 {l.prohibition} | 📌 {l.duty} | Geltungsbereich: {l.scope}
              </p>
              <Schulzuweisung lizenzId={l.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
