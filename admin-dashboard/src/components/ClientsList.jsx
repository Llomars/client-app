import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    updateDoc,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { db } from '../firebaseConfig';
import RdvNoteForm from './RdvNoteForm';
import RdvNotesList from './RdvNotesList';

function ClientsList() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    codePostal: '',
    ville: '',
    montant: '',
    frequence: 'Mensuel',
    commercial: '',
    emailCommercial: '', // ✅ CORRECT
    provenance: 'Phone',
    statut: 'En cours',
    prixCentrale: '',
    professionMr: '',
    professionMme: '',
    ageMr: '',
    ageMme: '',
  });
  const [showEtude, setShowEtude] = useState(false);
  const [etudeClient, setEtudeClient] = useState(null);
  const [showFiche, setShowFiche] = useState(false);
  const [ficheClient, setFicheClient] = useState(null);
  const [showRdvNoteForm, setShowRdvNoteForm] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Filtrer pour ne garder que les clients du commercial connecté
      if (currentUser) {
        setClients(data.filter(c => c.uidCommercial === currentUser.uid));
      } else {
        setClients([]);
      }
    });
    return () => unsubscribe();
  }, [currentUser]);

  const saveClient = async () => {
    const { nom, prenom, email, telephone } = form;
    if (!nom || !prenom || !email || !telephone) {
      toast.error('Merci de remplir les champs obligatoires.');
      return;
    }

    // Ajoute l'UID du commercial connecté
    const clientData = { ...form };
    if (currentUser) {
      clientData.uidCommercial = currentUser.uid;
    }

    if (editingId) {
      await updateDoc(doc(db, 'clients', editingId), clientData);
      toast.success('✅ Client mis à jour.');
    } else {
      await addDoc(collection(db, 'clients'), clientData);
      toast.success('✅ Client ajouté.');
    }

    setForm({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      codePostal: '',
      ville: '',
      montant: '',
      frequence: 'Mensuel',
      commercial: '',
      emailCommercial: '', // ✅ reset aussi
      provenance: 'Phone',
      statut: 'En cours',
      prixCentrale: '',
      professionMr: '',
      professionMme: '',
      ageMr: '',
      ageMme: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const editClient = (client) => {
    setForm(client);
    setEditingId(client.id);
    setShowForm(true);
  };

  const deleteClient = async (id) => {
    if (window.confirm('Confirmer la suppression ?')) {
      await deleteDoc(doc(db, 'clients', id));
      toast.info('🗑️ Client supprimé.');
    }
  };

  const changeStatus = async (id, newStatus) => {
    await updateDoc(doc(db, 'clients', id), { statut: newStatus });
    toast.success(`✅ Statut mis à jour en "${newStatus}".`);
  };

  // Quand on ouvre une fiche client, on réinitialise l'affichage du formulaire RDV
  const openFicheClient = (c) => {
    setFicheClient(c);
    setShowFiche(true);
    setShowRdvNoteForm(false);
  };

  return (
    <div
      style={{
        fontFamily: 'Inter, sans-serif',
        padding: '30px',
        maxWidth: '1200px',
        margin: '40px auto',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '30px',
        }}
      >
        <h2>👥 Clients</h2>
        <button
          className="btn green"
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
          }}
        >
          ➕ Ajouter un Client
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ background: '#f1f5f9' }}>
          <tr>
            {[
              'Nom',
              'Prénom',
              'Email',
              'Téléphone',
              'Adresse',
              'Code Postal',
              'Ville',
              'Montant EDF',
              'Fréquence',
              'Provenance',
              'Prix Centrale',
              'Profession Mr',
              'Profession Mme',
              'Age Mr',
              'Age Mme',
              'Statut',
              'Commercial',
              'Email Commercial',
              'Actions',
              'Étude',
            ].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '12px' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr
              key={c.id}
              style={{
                borderBottom: '1px solid #eee',
                background: '#fff',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
                openFicheClient(c);
              }}
            >
              <td>{c.nom}</td>
              <td>{c.prenom}</td>
              <td>{c.email}</td>
              <td>{c.telephone}</td>
              <td>{c.adresse}</td>
              <td>{c.codePostal}</td>
              <td>{c.ville}</td>
              <td>{c.montant} €</td>
              <td>{c.frequence}</td>
              <td>{c.provenance}</td>
              <td>{c.prixCentrale || '-'}</td>
              <td>{c.professionMr || '-'}</td>
              <td>{c.professionMme || '-'}</td>
              <td>{c.ageMr || '-'}</td>
              <td>{c.ageMme || '-'}</td>
              <td>
                <select
                  value={c.statut || 'En cours'}
                  onChange={(e) => changeStatus(c.id, e.target.value)}
                  className="select"
                >
                  {[
                    'En cours',
                    'Signé',
                    'Acompte versé',
                    'Vendu',
                    'Installé',
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </td>
              <td>{c.commercial || '-'}</td>
              <td>{c.emailCommercial || '-'}</td>
              <td>
                <button
                  className="btn blue"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (c.etudePerso) {
                      setEtudeClient({ ...c, etudePerso: c.etudePerso });
                      setShowEtude(true);
                    } else {
                      alert('Aucune étude personnalisée enregistrée pour ce client.');
                    }
                  }}
                >
                  📄 Voir l'étude
                </button>
              </td>
              <td>
                <button
                  onClick={(e) => { e.stopPropagation(); editClient(c); }}
                  className="btn blue"
                  style={{ marginRight: '5px' }}
                >
                  ✏️
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteClient(c.id); }} className="btn red">
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Modal d'affichage de l'étude personnalisée */}
      {showEtude && etudeClient && (
        <div
          style={{
            background: '#00000066',
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '32px',
              borderRadius: '16px',
              width: '480px',
              maxWidth: '95vw',
              boxShadow: '0 10px 30px rgba(0,0,0,0.13)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowEtude(false)}
              style={{
                position: 'absolute',
                right: 18,
                top: 18,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                fontSize: 22,
                cursor: 'pointer',
                color: '#334155',
                boxShadow: '0 2px 8px #2563eb11',
              }}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center' }}>
              Étude personnalisée de {etudeClient.nom} {etudeClient.prenom}
            </h3>
            {etudeClient.etudePerso ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <b>Production annuelle :</b> {etudeClient.etudePerso.prod} kWh
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Puissance installée :</b> {etudeClient.etudePerso.puissance} kWc
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Consommation annuelle :</b> {etudeClient.etudePerso.conso || '—'} kWh
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Autonomie estimée :</b> {etudeClient.etudePerso.prod && etudeClient.etudePerso.conso ? Math.min(100, Math.round((etudeClient.etudePerso.prod / etudeClient.etudePerso.conso) * 100)) + ' %' : '—'}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Surplus estimé :</b> {etudeClient.etudePerso.prod && etudeClient.etudePerso.conso ? Math.max(0, Math.round(etudeClient.etudePerso.prod - etudeClient.etudePerso.conso)) + ' kWh' : '—'}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Profil consommateur :</b> {etudeClient.etudePerso.profils && etudeClient.etudePerso.profils.join(', ')}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Équipements :</b> {etudeClient.etudePerso.equipements && etudeClient.etudePerso.equipements.join(', ')}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Localisation :</b> {etudeClient.etudePerso.localisation} (lat: {etudeClient.etudePerso.lat}, lon: {etudeClient.etudePerso.lon})
                </div>
                <div style={{ marginTop: 12, fontSize: 14, color: '#888' }}>
                  Source : <a href="https://re.jrc.ec.europa.eu/pvg_tools/en/" target="_blank" rel="noopener noreferrer">PVGIS</a>
                </div>
              </div>
            ) : (
              <div>Aucune étude personnalisée enregistrée.</div>
            )}
          </div>
        </div>
      )}
      {/* Modal fiche client complète */}
      {showFiche && ficheClient && (
        <div
          style={{
            background: '#00000066',
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '32px',
              borderRadius: '16px',
              width: '520px',
              maxWidth: '98vw',
              boxShadow: '0 10px 30px rgba(0,0,0,0.13)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => { setShowFiche(false); setShowRdvNoteForm(false); }}
              style={{
                position: 'absolute',
                right: 18,
                top: 18,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                fontSize: 22,
                cursor: 'pointer',
                color: '#334155',
                boxShadow: '0 2px 8px #2563eb11',
              }}
            >
              ×
            </button>
            <h3 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center' }}>
              Fiche client : {ficheClient.nom} {ficheClient.prenom}
            </h3>
            <div style={{ marginBottom: 18 }}>
              <b>Email :</b> {ficheClient.email}<br />
              <b>Téléphone :</b> {ficheClient.telephone}<br />
              <b>Adresse :</b> {ficheClient.adresse}, {ficheClient.codePostal} {ficheClient.ville}<br />
              <b>Statut :</b> {ficheClient.statut}<br />
              <b>Commercial :</b> {ficheClient.commercial || '-'}<br />
              <b>Montant EDF :</b> {ficheClient.montant || '-'} €<br />
              <b>Prix Centrale :</b> {ficheClient.prixCentrale || '-'} €<br />
              <b>Profession Mr :</b> {ficheClient.professionMr || '-'}<br />
              <b>Profession Mme :</b> {ficheClient.professionMme || '-'}<br />
              <b>Age Mr :</b> {ficheClient.ageMr || '-'}<br />
              <b>Age Mme :</b> {ficheClient.ageMme || '-'}<br />
            </div>
            <div style={{ borderTop: '1px solid #eee', margin: '18px 0' }} />
            <h4 style={{ marginBottom: 12 }}>Étude personnalisée</h4>
            {ficheClient.etudePerso ? (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <b>Production annuelle :</b> {ficheClient.etudePerso.prod} kWh
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Puissance installée :</b> {ficheClient.etudePerso.puissance} kWc
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Consommation annuelle :</b> {ficheClient.etudePerso.conso || '—'} kWh
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Autonomie estimée :</b> {ficheClient.etudePerso.prod && ficheClient.etudePerso.conso ? Math.min(100, Math.round((ficheClient.etudePerso.prod / ficheClient.etudePerso.conso) * 100)) + ' %' : '—'}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Surplus estimé :</b> {ficheClient.etudePerso.prod && ficheClient.etudePerso.conso ? Math.max(0, Math.round(ficheClient.etudePerso.prod - ficheClient.etudePerso.conso)) + ' kWh' : '—'}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Profil consommateur :</b> {ficheClient.etudePerso.profils && ficheClient.etudePerso.profils.join(', ')}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Équipements :</b> {ficheClient.etudePerso.equipements && ficheClient.etudePerso.equipements.join(', ')}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <b>Localisation :</b> {ficheClient.etudePerso.localisation} (lat: {ficheClient.etudePerso.lat}, lon: {ficheClient.etudePerso.lon})
                </div>
                <div style={{ marginTop: 12, fontSize: 14, color: '#888' }}>
                  Source : <a href="https://re.jrc.ec.europa.eu/pvg_tools/en/" target="_blank" rel="noopener noreferrer">PVGIS</a>
                </div>
              </div>
            ) : (
              <div>Aucune étude personnalisée enregistrée.</div>
            )}
            <div style={{ borderTop: '1px solid #eee', margin: '18px 0' }} />
            {/* Bouton et formulaire de compte-rendu RDV */}
            <div style={{ marginBottom: 16 }}>
              <button
                className="btn green"
                onClick={() => setShowRdvNoteForm((v) => !v)}
                style={{ marginBottom: 10 }}
              >
                {showRdvNoteForm ? 'Fermer le formulaire RDV' : 'Ajouter un compte-rendu RDV'}
              </button>
              {showRdvNoteForm && (
                <RdvNoteForm
                  commercial={{ id: ficheClient.emailCommercial, nom: ficheClient.commercial }}
                  manager={{ id: ficheClient.managerId, email: ficheClient.managerEmail }}
                  rdvId={ficheClient.id}
                />
              )}
            </div>
            <RdvNotesList clientId={ficheClient.id} />
          </div>
        </div>
      )}

      {showForm && (
        <div
          style={{
            background: '#00000066',
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '30px',
              borderRadius: '12px',
              width: '500px',
              maxWidth: '90%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ marginTop: 0 }}>
              {editingId ? '✏️ Modifier le Client' : '➕ Ajouter un Client'}
            </h3>
            {[
              { name: 'nom', label: 'Nom *' },
              { name: 'prenom', label: 'Prénom *' },
              { name: 'email', label: 'Email *' },
              { name: 'telephone', label: 'Téléphone *' },
              { name: 'adresse', label: 'Adresse' },
              { name: 'codePostal', label: 'Code Postal' },
              { name: 'ville', label: 'Ville' },
              { name: 'montant', label: 'Montant EDF (€)' },
              { name: 'prixCentrale', label: 'Prix Centrale (€)' },
              { name: 'professionMr', label: 'Profession Mr' },
              { name: 'professionMme', label: 'Profession Mme' },
              { name: 'ageMr', label: 'Age Mr' },
              { name: 'ageMme', label: 'Age Mme' },
              { name: 'commercial', label: 'Commercial' },
              { name: 'emailCommercial', label: 'Email Commercial' }, // ✅ AJOUT
            ].map((field) => (
              <input
                key={field.name}
                placeholder={field.label}
                value={form[field.name]}
                onChange={(e) =>
                  setForm({ ...form, [field.name]: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '12px',
                  margin: '8px 0',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                }}
              />
            ))}
            <select
              value={form.frequence}
              onChange={(e) => setForm({ ...form, frequence: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                margin: '8px 0',
                border: '1px solid #ddd',
                borderRadius: '8px',
              }}
            >
              {['Mensuel', 'Bimensuel', 'Annuel'].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <select
              value={form.provenance}
              onChange={(e) => setForm({ ...form, provenance: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                margin: '8px 0',
                border: '1px solid #ddd',
                borderRadius: '8px',
              }}
            >
              {['Phone', 'Salon', 'Contact Perso', 'Parrainage'].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
            <select
              value={form.statut}
              onChange={(e) => setForm({ ...form, statut: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                margin: '8px 0',
                border: '1px solid #ddd',
                borderRadius: '8px',
              }}
            >
              {['En cours', 'Signé', 'Acompte versé', 'Vendu', 'Installé'].map(
                (s) => (
                  <option key={s}>{s}</option>
                )
              )}
            </select>
            <div style={{ textAlign: 'right' }}>
              <button
                className="btn grey"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                style={{ marginRight: '10px' }}
              >
                Annuler
              </button>
              <button className="btn green" onClick={saveClient}>
                {editingId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} />
      <style>{`
        .btn {
          padding: 8px 14px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: 0.2s;
        }
        .btn:hover { opacity: 0.9; }
        .btn.green { background: #22c55e; color: white; }
        .btn.red { background: #ef4444; color: white; }
        .btn.grey { background: #64748b; color: white; }
        .btn.blue { background: #3b82f6; color: white; }
        .select {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }
      `}</style>
    </div>
  );
}

export default ClientsList;
