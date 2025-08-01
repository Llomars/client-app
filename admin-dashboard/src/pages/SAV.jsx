import { addDoc, collection as col, collection, doc, onSnapshot, orderBy, query, setDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';

export default function SAV() {
  const [messages, setMessages] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [reply, setReply] = useState('');
  const [tab, setTab] = useState('conversations'); // 'conversations' ou 'a-programmer'
  const [savTasks, setSavTasks] = useState([]);

  // Liste toutes les conversations (par utilisateur)
  useEffect(() => {
    const q = query(collection(db, 'sav-messages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Regroupe les messages par utilisateur (si tu as un champ userId/email dans chaque message)
  const grouped = {};
  messages.forEach(m => {
    const key = m.userId || m.email || 'inconnu';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  // Récupère les SAV à programmer
  useEffect(() => {
    const unsub = onSnapshot(col(db, 'sav-tasks'), snap => {
      setSavTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleSend = async () => {
    if (!reply.trim() || !selectedConv) return;
    await addDoc(collection(db, 'sav-messages'), {
      text: reply,
      createdAt: Timestamp.now(),
      admin: true,
      read: false,
      userId: selectedConv,
    });
    setReply('');
  };

  return (
    <div style={{ display: 'flex', height: '80vh', background: '#f8fafc', borderRadius: 12, boxShadow: '0 2px 12px #2563eb11', margin: 30 }}>
      {/* Liste des conversations */}
      <div style={{ width: 260, borderRight: '1px solid #e5e7eb', overflowY: 'auto' }}>
        <h3 style={{ padding: 16, margin: 0, borderBottom: '1px solid #e5e7eb', background: '#fff' }}>Demandes SAV</h3>
        <div style={{ display: 'flex', gap: 6, padding: 8 }}>
          <button onClick={() => setTab('conversations')} style={{ background: tab === 'conversations' ? '#2563eb' : '#e5e7eb', color: tab === 'conversations' ? '#fff' : '#222', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 600, cursor: 'pointer' }}>Conversations</button>
          <button onClick={() => setTab('a-programmer')} style={{ background: tab === 'a-programmer' ? '#2563eb' : '#e5e7eb', color: tab === 'a-programmer' ? '#fff' : '#222', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 600, cursor: 'pointer' }}>SAV à programmer</button>
        </div>
        {tab === 'conversations' && Object.keys(grouped).map(user => (
          <div key={user} onClick={() => setSelectedConv(user)} style={{ padding: 16, cursor: 'pointer', background: selectedConv === user ? '#e0e7ff' : '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <b>{user}</b>
              <div style={{ fontSize: 13, color: '#64748b' }}>{grouped[user].length} message(s)</div>
            </div>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                // Ajoute une tâche SAV à programmer pour ce client
                await setDoc(doc(db, 'sav-tasks', user), {
                  userId: user,
                  createdAt: new Date(),
                  status: 'à programmer',
                  infos: '',
                  date: null,
                });
              }}
              style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}
              title="Placer en SAV à programmer"
            >
              ➕ SAV
            </button>
          </div>
        ))}
        {tab === 'a-programmer' && (
          <div style={{ padding: 10 }}>
            <h4 style={{ margin: '10px 0 16px 0', color: '#2563eb' }}>SAV à programmer</h4>
            {savTasks.length === 0 && <div style={{ color: '#64748b' }}>Aucun SAV à programmer.</div>}
            {savTasks.map(task => (
              <div key={task.id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #2563eb11', marginBottom: 14, padding: 14 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{task.userId}</div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Créé le : {task.createdAt?.toDate?.().toLocaleString('fr-FR') || ''}</div>
                <div style={{ marginBottom: 8 }}>
                  <label>Date d'intervention : </label>
                  <input type="date" value={task.date ? task.date.split('T')[0] : ''} onChange={async e => {
                    await setDoc(doc(db, 'sav-tasks', task.id), { ...task, date: e.target.value }, { merge: true });
                  }} style={{ borderRadius: 6, border: '1px solid #ddd', padding: 6 }} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label>Infos intervention : </label>
                  <input type="text" value={task.infos || ''} onChange={async e => {
                    await setDoc(doc(db, 'sav-tasks', task.id), { ...task, infos: e.target.value }, { merge: true });
                  }} style={{ borderRadius: 6, border: '1px solid #ddd', padding: 6, width: 180 }} />
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>Statut : {task.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Conversation sélectionnée */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {selectedConv ? (
            grouped[selectedConv].map((m, i) => (
              <div key={i} style={{ marginBottom: 18, textAlign: m.admin ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', background: m.admin ? '#2563eb' : '#e5e7eb', color: m.admin ? '#fff' : '#222', borderRadius: 8, padding: '10px 16px', maxWidth: 400 }}>
                  {m.text}
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{m.createdAt?.toDate?.().toLocaleString('fr-FR') || ''}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#64748b', marginTop: 40 }}>Sélectionne une conversation à gauche</div>
          )}
        </div>
        {/* Champ de réponse */}
        {selectedConv && (
          <div style={{ padding: 16, borderTop: '1px solid #e5e7eb', background: '#fff', display: 'flex', gap: 10 }}>
            <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Répondre..." style={{ flex: 1, borderRadius: 8, border: '1px solid #ddd', padding: 12, fontSize: 16 }} />
            <button onClick={handleSend} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '0 22px', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>Envoyer</button>
          </div>
        )}
      </div>
    </div>
  );
}
