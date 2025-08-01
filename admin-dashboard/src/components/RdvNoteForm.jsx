import React, { useState, useRef } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function RdvNoteForm({ commercial, manager, rdvId, onSaved }) {
  const [form, setForm] = useState({
    positif: '',
    negatif: '',
    ressenti: '',
    vendu: '',
    raison: '',
    loading: false,
    error: '',
    success: false,
  });
  const [listening, setListening] = useState({});
  const recognitionRef = useRef(null);

  // Lance la reconnaissance vocale pour un champ donné
  const startListening = (field) => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('La reconnaissance vocale n\'est pas supportée sur ce navigateur.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening((l) => ({ ...l, [field]: true }));
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm((f) => ({ ...f, [field]: (f[field] ? f[field] + ' ' : '') + transcript }));
    };
    recognition.onend = () => {
      setListening((l) => ({ ...l, [field]: false }));
    };
    recognition.onerror = () => {
      setListening((l) => ({ ...l, [field]: false }));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setForm(f => ({ ...f, loading: true, error: '', success: false }));
    try {
      await addDoc(collection(db, 'rdvNotes'), {
        commercialId: commercial.id,
        commercialNom: commercial.nom,
        managerId: manager.id,
        managerEmail: manager.email,
        rdvId,
        positif: form.positif,
        negatif: form.negatif,
        ressenti: form.ressenti,
        vendu: form.vendu,
        raison: form.raison,
        createdAt: Timestamp.now(),
      });
      setForm(f => ({ ...f, loading: false, success: true }));
      if (onSaved) onSaved();
    } catch (e) {
      setForm(f => ({ ...f, loading: false, error: e.message }));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#f8fafc', borderRadius: 12, padding: 24, maxWidth: 480, margin: '0 auto', boxShadow: '0 2px 12px #2563eb11' }}>
      <h3 style={{ color: '#2563eb', fontWeight: 700, marginBottom: 18 }}>Compte-rendu du rendez-vous</h3>
      <div style={{ marginBottom: 12 }}>
        <label>Ce qui s'est bien passé :</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <textarea name="positif" value={form.positif} onChange={handleChange} required style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #e5e7eb', padding: 8 }} />
          <button type="button" onClick={() => startListening('positif')} style={{ background: listening.positif ? '#10b981' : '#e0e7ef', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }} title="Dicter">
            <span role="img" aria-label="micro">🎤</span>
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Ce qui s'est moins bien passé :</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <textarea name="negatif" value={form.negatif} onChange={handleChange} required style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #e5e7eb', padding: 8 }} />
          <button type="button" onClick={() => startListening('negatif')} style={{ background: listening.negatif ? '#10b981' : '#e0e7ef', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }} title="Dicter">
            <span role="img" aria-label="micro">🎤</span>
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Ressenti du commercial :</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <textarea name="ressenti" value={form.ressenti} onChange={handleChange} required style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #e5e7eb', padding: 8 }} />
          <button type="button" onClick={() => startListening('ressenti')} style={{ background: listening.ressenti ? '#10b981' : '#e0e7ef', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }} title="Dicter">
            <span role="img" aria-label="micro">🎤</span>
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Vente réalisée ?</label>
        <select name="vendu" value={form.vendu} onChange={handleChange} required style={{ width: '100%', borderRadius: 6, border: '1px solid #e5e7eb', padding: 8 }}>
          <option value="">Sélectionner</option>
          <option value="oui">Oui</option>
          <option value="non">Non</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Si non vendu, pourquoi ?</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <textarea name="raison" value={form.raison} onChange={handleChange} style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #e5e7eb', padding: 8 }} />
          <button type="button" onClick={() => startListening('raison')} style={{ background: listening.raison ? '#10b981' : '#e0e7ef', border: 'none', borderRadius: '50%', width: 38, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }} title="Dicter">
            <span role="img" aria-label="micro">🎤</span>
          </button>
        </div>
      </div>
      {form.error && <div style={{ color: '#ef4444', marginBottom: 10 }}>{form.error}</div>}
      {form.success && <div style={{ color: '#22c55e', marginBottom: 10 }}>Note envoyée au manager !</div>}
      <button type="submit" disabled={form.loading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: form.loading ? 'not-allowed' : 'pointer' }}>
        {form.loading ? 'Envoi...' : 'Envoyer la note'}
      </button>
    </form>
  );
}
