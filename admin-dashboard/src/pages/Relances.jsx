import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';

export default function Relances() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [dateRelance, setDateRelance] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [clients, setClients] = useState([]);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relances, setRelances] = useState([]);
  const [relanceFilter, setRelanceFilter] = useState('jour'); // 'jour', 'avenir', 'enAttente'
  const [editId, setEditId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editComment, setEditComment] = useState('');
  const [relanceErreur, setRelanceErreur] = useState('');
  const [relanceTab, setRelanceTab] = useState('mes'); // 'mes', 'toutesAVenir'
  const [filterMonth, setFilterMonth] = useState(''); // format 'YYYY-MM'
  const navigate = useNavigate();

  const [allRelances, setAllRelances] = useState([]);
  useEffect(() => {
    async function fetchAllRelances() {
      if (userRole === 'admin' || userRole === 'manager') {
        const snap = await getDocs(collection(db, 'relances'));
        setAllRelances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setAllRelances([]);
      }
    }
    fetchAllRelances();
  }, [userRole]);

  const [allClients, setAllClients] = useState([]);
  useEffect(() => {
    async function fetchAllClients() {
      if (userRole === 'admin' || userRole === 'manager') {
        const snap = await getDocs(collection(db, 'clients'));
        setAllClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else {
        setAllClients([]);
      }
    }
    fetchAllClients();
  }, [userRole]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const tokenResult = await u.getIdTokenResult();
        setUserRole(tokenResult.claims.role || null);
        // Charger la liste des clients selon le rôle
        let q;
        if (tokenResult.claims.role === 'commercial') {
          q = query(collection(db, 'clients'), where('emailCommercial', '==', u.email));
        } else {
          q = query(collection(db, 'clients'), where('emailManager', '==', u.email));
        }
        const snap = await getDocs(q);
        setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Charger les relances de l'utilisateur
  useEffect(() => {
    if (!user) return;
    async function fetchRelances() {
      let q;
      if (userRole === 'commercial') {
        q = query(collection(db, 'relances'), where('creePar', '==', user.email));
      } else {
        // Pour manager/admin, toutes les relances de ses clients
        const clientIds = clients.map(c => c.id);
        if (clientIds.length === 0) return setRelances([]);
        // Firestore ne supporte pas where in > 10, donc on filtre après
        const snap = await getDocs(collection(db, 'relances'));
        setRelances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(r => clientIds.includes(r.clientId)));
        return;
      }
      const snap = await getDocs(q);
      setRelances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchRelances();
  }, [user, userRole, clients]);

  // Ajout : fonction pour rafraîchir les relances
  async function refreshRelances() {
    let q;
    if (userRole === 'commercial') {
      q = query(collection(db, 'relances'), where('creePar', '==', user.email));
    } else {
      const clientIds = clients.map(c => c.id);
      if (clientIds.length === 0) return setRelances([]);
      const snap = await getDocs(collection(db, 'relances'));
      setRelances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(r => clientIds.includes(r.clientId)));
      return;
    }
    const snap = await getDocs(q);
    setRelances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  const handleSaveRelance = async () => {
    setRelanceErreur('');
    if (!selectedClient || !dateRelance) {
      setRelanceErreur('Merci de sélectionner un client et une date.');
      return;
    }
    try {
      await addDoc(collection(db, 'relances'), {
        clientId: selectedClient,
        dateRelance,
        commentaire,
        creePar: user?.email,
        creeLe: new Date().toISOString(),
      });
      alert('Relance enregistrée !');
      setSelectedClient(null);
      setDateRelance('');
      setCommentaire('');
      refreshRelances();
    } catch (err) {
      setRelanceErreur("Erreur lors de l'ajout de la relance : " + (err.message || err));
      setSelectedClient(null);
      setDateRelance('');
      setCommentaire('');
    }
  };

  // Edition relance
  const handleEditClick = (relance) => {
    setEditId(relance.id);
    setEditDate(relance.dateRelance);
    setEditComment(relance.commentaire);
  };
  const handleEditSave = async (relance) => {
    await updateDoc(doc(db, 'relances', relance.id), {
      dateRelance: editDate,
      commentaire: editComment,
    });
    setEditId(null);
    setEditDate('');
    setEditComment('');
    refreshRelances();
  };
  const handleDelete = async (relance) => {
    if (!window.confirm('Supprimer cette relance ?')) return;
    await deleteDoc(doc(db, 'relances', relance.id));
    refreshRelances();
  };

  // Filtres relances
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  // Relances du jour ET non effectuées
  const relancesDuJour = relances.filter(r => r.dateRelance === todayStr && !r.effectuee);
  // Relances à venir (date future)
  const relancesAVenir = relances.filter(r => r.dateRelance > todayStr && !r.effectuee);
  // Relances en attente = toutes les relances passées ou du jour non effectuées
  const relancesEnAttente = relances.filter(r => r.dateRelance <= todayStr && !r.effectuee);
  // Relances filtrées selon le filtre sélectionné
  let relancesFiltrees = [];
  if (relanceFilter === 'jour') relancesFiltrees = relancesDuJour;
  else if (relanceFilter === 'avenir') relancesFiltrees = relancesAVenir;
  else if (relanceFilter === 'enAttente') relancesFiltrees = relancesEnAttente;

  // Met à jour le localStorage pour la pastille header
  useEffect(() => {
    localStorage.setItem('relancesJourCount', relancesDuJour.length);
    window.dispatchEvent(new Event('storage'));
  }, [relancesDuJour.length]);

  if (loading) return <div style={{ padding: 40 }}>Chargement...</div>;

  // Ajout fonction pour cocher/décocher une relance comme effectuée
  const handleToggleEffectuee = async (relance) => {
    await updateDoc(doc(db, 'relances', relance.id), { effectuee: !relance.effectuee });
    refreshRelances();
  };

  // Relances à venir (toutes, tous users, pour admin/manager)
  const allRelancesAVenir = allRelances
    .filter(r => r.dateRelance > todayStr && !r.effectuee)
    .sort((a, b) => a.dateRelance.localeCompare(b.dateRelance));
  // Filtrage par mois/année
  const allRelancesFiltered = filterMonth
    ? allRelancesAVenir.filter(r => r.dateRelance && r.dateRelance.startsWith(filterMonth))
    : allRelancesAVenir;

  // Liste des mois disponibles dans les relances à venir
  const moisDispo = Array.from(new Set(allRelancesAVenir.map(r => r.dateRelance?.slice(0,7)))).sort();

  return (
    <div style={{ padding: 40 }}>
      <h2>Créer une relance</h2>
      {/* Onglets relances */}
      {(userRole === 'admin' || userRole === 'manager') && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setRelanceTab('mes')} style={{ padding: '8px 18px', background: relanceTab === 'mes' ? '#2563eb' : '#e5e7eb', color: relanceTab === 'mes' ? '#fff' : '#334155', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Mes relances</button>
          <button onClick={() => setRelanceTab('toutesAVenir')} style={{ padding: '8px 18px', background: relanceTab === 'toutesAVenir' ? '#2563eb' : '#e5e7eb', color: relanceTab === 'toutesAVenir' ? '#fff' : '#334155', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Toutes les relances à venir</button>
        </div>
      )}
      {/* Filtre mois/année pour toutes les relances à venir */}
      {relanceTab === 'toutesAVenir' && (userRole === 'admin' || userRole === 'manager') && (
        <div style={{ marginBottom: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Filtrer par mois :</span>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16 }}>
            <option value="">Tous</option>
            {moisDispo.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      )}
      {/* Affichage selon l'onglet sélectionné */}
      {relanceTab === 'toutesAVenir' && (userRole === 'admin' || userRole === 'manager') ? (
        <>
          <h2>Toutes les relances à venir</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {allRelancesFiltered.length === 0 && (
              <li style={{ color: '#64748b', fontWeight: 600 }}>Aucune relance à venir.</li>
            )}
            {allRelancesFiltered.map(r => {
              const client = (userRole === 'admin' || userRole === 'manager') && relanceTab === 'toutesAVenir'
                ? allClients.find(c => c.id === r.clientId)
                : clients.find(c => c.id === r.clientId);
              return (
                <li key={r.id} style={{ background: '#f1f5f9', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{client ? `${client.nom} ${client.prenom}` : 'Client inconnu'}</div>
                  <div style={{ color: '#2563eb', fontWeight: 500 }}>Date de relance : {r.dateRelance}</div>
                  <div style={{ fontSize: 15, margin: '6px 0' }}>Commentaire : {r.commentaire}</div>
                  <div style={{ color: '#64748b', fontSize: 14 }}>Créée par : {r.creePar}</div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600 }}>Client :</label><br />
            <select value={selectedClient || ''} onChange={e => setSelectedClient(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 260 }}>
              <option value="">Sélectionner un client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600 }}>Date de relance :</label><br />
            <input type="date" value={dateRelance} onChange={e => setDateRelance(e.target.value)} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 200 }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 600 }}>Commentaire :</label><br />
            <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)} style={{ width: 400, minHeight: 60, borderRadius: 6, border: '1px solid #d1d5db', padding: 8, fontSize: 16 }} />
          </div>
          <button onClick={handleSaveRelance} disabled={!selectedClient || !dateRelance} style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Enregistrer la relance
          </button>
          <button onClick={() => navigate(-1)} style={{ marginLeft: 16, padding: '8px 18px', background: '#e5e7eb', color: '#334155', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>
            Retour
          </button>
          {/* Affichage du message d'erreur relance */}
          {relanceErreur && <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 12 }}>{relanceErreur}</div>}
          <hr style={{ margin: '32px 0' }} />
          <h2>Liste des relances</h2>
          <div style={{ marginBottom: 18, display: 'flex', gap: 12 }}>
            <button onClick={() => setRelanceFilter('jour')} style={{ padding: '8px 18px', background: relanceFilter === 'jour' ? '#2563eb' : '#e5e7eb', color: relanceFilter === 'jour' ? '#fff' : '#334155', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer', position: 'relative' }}>
              Relances du jour
              {relancesDuJour.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: '0 2px 8px #ef444488',
                  zIndex: 2
                }}>{relancesDuJour.length}</span>
              )}
            </button>
            <button onClick={() => setRelanceFilter('avenir')} style={{ padding: '8px 18px', background: relanceFilter === 'avenir' ? '#2563eb' : '#e5e7eb', color: relanceFilter === 'avenir' ? '#fff' : '#334155', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Relances à venir</button>
            <button onClick={() => setRelanceFilter('enAttente')} style={{ padding: '8px 18px', background: relanceFilter === 'enAttente' ? '#ef4444' : '#e5e7eb', color: relanceFilter === 'enAttente' ? '#fff' : '#334155', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Relances en attente
              {relancesEnAttente.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  minWidth: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  boxShadow: '0 2px 8px #ef444488',
                  zIndex: 2
                }}>{relancesEnAttente.length}</span>
              )}
            </button>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {relancesFiltrees.length === 0 && (
              <li style={{ color: '#64748b', fontWeight: 600 }}>Aucune relance à afficher.</li>
            )}
            {relancesFiltrees.map(r => {
              const client = clients.find(c => c.id === r.clientId);
              return (
                <li key={r.id} style={{ background: '#f1f5f9', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  {editId === r.id ? (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{client ? `${client.nom} ${client.prenom}` : 'Client inconnu'}</div>
                      <div style={{ color: '#2563eb', fontWeight: 500 }}>
                        Date de relance :
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} />
                      </div>
                      <div style={{ fontSize: 15, margin: '6px 0' }}>
                        Commentaire :
                        <input type="text" value={editComment} onChange={e => setEditComment(e.target.value)} style={{ marginLeft: 8, padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15, width: 220 }} />
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        <button onClick={() => handleEditSave(r)} style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Enregistrer</button>
                        <button onClick={() => setEditId(null)} style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{client ? `${client.nom} ${client.prenom}` : 'Client inconnu'}</div>
                      <div style={{ color: '#2563eb', fontWeight: 500 }}>Date de relance : {r.dateRelance}</div>
                      <div style={{ fontSize: 15, margin: '6px 0' }}>Commentaire : {r.commentaire}</div>
                      <div style={{ color: '#64748b', fontSize: 14 }}>Créée par : {r.creePar}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                        <button onClick={() => handleEditClick(r)} style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Modifier</button>
                        <button onClick={() => handleDelete(r)} style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Supprimer</button>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#10b981', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!r.effectuee} onChange={() => handleToggleEffectuee(r)} /> Effectuée
                        </label>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
