import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function RdvNotesList({ clientId }) {
  const [notes, setNotes] = useState([]);
  useEffect(() => {
    if (!clientId) return;
    const q = query(collection(db, 'rdvNotes'), where('rdvId', '==', clientId));
    const unsub = onSnapshot(q, snap => {
      setNotes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [clientId]);
  if (!clientId) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <h4 style={{ marginBottom: 10, color: '#2563eb' }}>Comptes-rendus RDV</h4>
      {notes.length === 0 && <div style={{ color: '#888' }}>Aucun compte-rendu pour ce client.</div>}
      {notes.map(note => (
        <div key={note.id} style={{ background: '#f1f5f9', borderRadius: 8, padding: 14, marginBottom: 12, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>
            <b>Commercial :</b> {note.commercialNom} | <b>Date :</b> {note.createdAt?.toDate?.().toLocaleString?.() || ''}
          </div>
          <div><b>Points positifs :</b> {note.positif}</div>
          <div><b>Points à améliorer :</b> {note.negatif}</div>
          <div><b>Ressenti :</b> {note.ressenti}</div>
          <div><b>Vente réalisée :</b> {note.vendu}</div>
          {note.vendu === 'non' && <div><b>Raison :</b> {note.raison}</div>}
        </div>
      ))}
    </div>
  );
}
