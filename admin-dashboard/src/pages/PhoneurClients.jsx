import { useEffect, useState } from 'react';
import { collection, addDoc, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function PhoneurClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', telephone: '' });
  const [editId, setEditId] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    getDocs(collection(db, 'clients')).then(snap => {
      const arr = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() }));
      setClients(arr);
    }).finally(() => setLoading(false));
  }, [status]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus('');
    try {
      if (editId) {
        await updateDoc(doc(db, 'clients', editId), form);
        setStatus('Client modifié !');
      } else {
        await addDoc(collection(db, 'clients'), form);
        setStatus('Client ajouté !');
      }
      setForm({ nom: '', email: '', telephone: '' });
      setEditId(null);
    } catch {
      setStatus('Erreur Firestore');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '40px auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px #c7d2fe', padding: 32 }}>
      <h2 style={{ color: '#3730a3', fontWeight: 900, fontSize: 24, marginBottom: 18 }}>Liste des clients</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <input name='nom' value={form.nom} onChange={handleChange} placeholder='Nom' style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', fontSize: 16 }} />
        <input name='email' value={form.email} onChange={handleChange} placeholder='Email' style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', fontSize: 16 }} />
        <input name='telephone' value={form.telephone} onChange={handleChange} placeholder='Téléphone' style={{ padding: 10, borderRadius: 8, border: '1.5px solid #c7d2fe', fontSize: 16 }} />
        <button type='submit' style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, fontSize: 16 }}>Enregistrer</button>
        {status && <div style={{ color: status.includes('Erreur') ? '#dc2626' : '#10b981', fontWeight: 700 }}>{status}</div>}
      </form>
      {loading ? <div>Chargement...</div> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {clients.map(c => (
            <li key={c.id} style={{ padding: 8, borderBottom: '1px solid #e0e7ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><b>{c.nom}</b> <span style={{ color: '#64748b', fontSize: 14 }}>{c.email}</span> <span style={{ color: '#64748b', fontSize: 14 }}>{c.telephone}</span></span>
              <button onClick={() => { setForm({ nom: c.nom || '', email: c.email || '', telephone: c.telephone || '' }); setEditId(c.id); }} style={{ background: '#c7d2fe', border: 'none', borderRadius: 6, padding: '4px 12px', fontWeight: 700, cursor: 'pointer' }}>Modifier</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
