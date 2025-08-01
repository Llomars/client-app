import React, { useState } from 'react';
import { generateICS, downloadICS } from '../utils/icsGenerator';

export default function PlanningModule({ commercial }) {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    date: '',
    heure: '',
    duree: 60,
    lieu: '',
    notes: '',
  });
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.heure) return alert('Date et heure requises');
    const [h, m] = form.heure.split(':');
    const startDate = new Date(form.date + 'T' + form.heure);
    const endDate = new Date(startDate.getTime() + form.duree * 60000);
    const ics = generateICS({
      title: `RDV client: ${form.nom} ${form.prenom}`,
      description: `Téléphone: ${form.telephone}\nEmail: ${form.email}\nNotes: ${form.notes}`,
      location: form.lieu,
      startDate,
      endDate,
    });
    downloadICS(ics, `rdv-${form.nom}-${form.prenom}.ics`);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
    setForm({ ...form, nom: '', prenom: '', telephone: '', email: '', date: '', heure: '', notes: '' });
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 480, margin: '0 auto', boxShadow: '0 4px 12px #2563eb11' }}>
      <h3 style={{ marginBottom: 18 }}>Ajouter un rendez-vous client</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input name="nom" placeholder="Nom client" value={form.nom} onChange={handleChange} required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <input name="prenom" placeholder="Prénom client" value={form.prenom} onChange={handleChange} required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <input name="telephone" placeholder="Téléphone" value={form.telephone} onChange={handleChange} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <input name="date" type="date" value={form.date} onChange={handleChange} required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <input name="heure" type="time" value={form.heure} onChange={handleChange} required style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <input name="lieu" placeholder="Lieu du RDV" value={form.lieu} onChange={handleChange} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <textarea name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} style={{ padding: 8, borderRadius: 4, border: '1px solid #ddd' }} />
        <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16, marginTop: 8 }}>Générer et télécharger l'événement</button>
      </form>
      {success && <div style={{ color: '#10b981', marginTop: 12 }}>✅ Fichier calendrier généré ! Ouvre-le pour l’ajouter à Apple Calendar.</div>}
      <div style={{ color: '#888', fontSize: 13, marginTop: 18 }}>
        Après avoir téléchargé le fichier, ouvre-le pour l’ajouter automatiquement à ton calendrier Apple, Google ou Outlook.
      </div>
    </div>
  );
}
