

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where, setDoc, increment } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { auth, db } from '../firebaseConfig';

const storage = getStorage();

export default function MesClients() {
  // Ajout état pour la liste des managers/admins
  const [managers, setManagers] = useState([]);
  // Options pour Facture EDF et Surface Toiture
  const factureEdfOptions = [
    { value: '30-90', label: '30/90€' },
    { value: '90-150', label: '90/150€' },
    { value: '150-250', label: '150/250€' },
    { value: '250plus', label: '+ de 250€' },
  ];
  const surfaceToitureOptions = [
    { value: '20-50', label: '20 à 50m²' },
    { value: '50-120', label: '50 à 120m²' },
    { value: '120plus', label: '+ de 120m²' },
  ];
  const handleSelectOption = (name, value) => {
    setFormRapide(prev => ({ ...prev, [name]: value }));
  };
  const [commerciaux, setCommerciaux] = useState([]);
  // Onglet actif : email du manager ou d'un commercial
  const [activeTab, setActiveTab] = useState('me');
  const [clients, setClients] = useState([]);
  const [nouveauClient, setNouveauClient] = useState({
    nom: '',
    prenom: '',
    adresse: '',
    ville: '',
    email: '',
    telephone: '',
    montantFactureEDF: '',
    ageMR: '',
    ageMME: '',
    professionMR: '',
    professionMME: '',
  });
  // Ajout état pour le formulaire rapide
  const [formRapide, setFormRapide] = useState({
    factureEdf: '',
    surfaceToiture: '',
    consoPiscine: false,
    consoClim: false,
    consoResistance: false,
    consoJacuzzi: false,
    consoVoiture: false,
    consoAutres: false,
    professionMR: '',
    ageMR: '',
    professionMME: '',
    ageMME: '',
    nom: '',
    prenom: '',
    adresseClient: '',
    telClient: '',
  });
  // Liste des éléments à forte conso pour affichage dynamique
  const elementsConsoList = [
    { key: 'consoPiscine', label: 'Piscine' },
    { key: 'consoClim', label: 'Clims' },
    { key: 'consoResistance', label: 'Résistance' },
    { key: 'consoJacuzzi', label: 'Jacuzzi' },
    { key: 'consoVoiture', label: 'Voiture électrique' },
    { key: 'consoAutres', label: 'Autres' },
  ];
  const handleToggleConso = (key) => {
    setFormRapide(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const [user, setUser] = useState(null);

  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [showUploadId, setShowUploadId] = useState(null);
  const [showDebriefId, setShowDebriefId] = useState(null);
  const [debrief, setDebrief] = useState({ bien: '', moinsBien: '', ressenti: '', venteEffectuee: '' });
  const docTypes = [
    'PI',
    'Facture EDF',
    'RIB',
    'Avis d’impots',
    'Taxe Fonciere',
    'Dernieres fiches de paies',
    'Devis',
    'Facture',
    'Plan de masse',
  ];
  const [dragOverType, setDragOverType] = useState(null);

  // Ajout gestion du statut vendu local
  const handleVendu = async (id) => {
    await updateDoc(doc(db, 'clients', id), { statut: 'Vendu' });
    setClients(clients.map(c => c.id === id ? { ...c, statut: 'Vendu' } : c));
  };
  const handleAnnulerVente = async (id) => {
    await updateDoc(doc(db, 'clients', id), { statut: 'En cours' });
    setClients(clients.map(c => c.id === id ? { ...c, statut: 'En cours' } : c));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Récupère les custom claims pour le rôle
        const token = await u.getIdTokenResult();
        setUserRole(token.claims.role || null);
      } else {
        setUserRole(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchClientsAndCommerciaux = async () => {
      setLoading(true);
      // Récupère tous les commerciaux attribués au manager
      const commerciauxSnap = await getDocs(query(collection(db, 'users'), where('managerEmail', '==', user.email)));
      const commerciauxList = commerciauxSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCommerciaux(commerciauxList);
      // Récupère tous les clients du manager et de ses commerciaux
      const clientsSnap = await getDocs(query(collection(db, 'clients'), where('emailManager', '==', user.email)));
      let clientList = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Récupère aussi les clients de chaque commercial géré
      for (const comm of commerciauxList) {
        const commClientsSnap = await getDocs(query(collection(db, 'clients'), where('emailCommercial', '==', comm.email)));
        const commClients = commClientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), _commercial: comm.email }));
        clientList = clientList.concat(commClients);
      }
      setClients([...clientList].reverse());
      // Onglet actif par défaut = 'me' (manager/admin)
      // Récupère tous les managers et admins pour la sélection du manager
      const managersSnap = await getDocs(query(collection(db, 'users'), where('role', 'in', ['manager', 'admin'])));
      let managersList = managersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ajoute TOUJOURS l'utilisateur connecté en tête de liste, sans doublon
      if (user) {
        managersList = [
          { email: user.email, nom: user.displayName || '', prenom: '', id: 'me' },
          ...managersList.filter(m => m.email !== user.email)
        ];
      }
      setManagers(managersList);
      setLoading(false);
    };
    fetchClientsAndCommerciaux();
  }, [user, userRole]);

  const handleChangeClient = (e) => {
    setNouveauClient({ ...nouveauClient, [e.target.name]: e.target.value });
  };
  // Gestion du formulaire rapide
  const handleChangeFormRapide = (e) => {
    const { name, type, value, checked } = e.target;
    setFormRapide(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  const handleEnregistrerRapide = async () => {
    if (!formRapide.nom || !formRapide.prenom || !formRapide.adresseClient || !formRapide.telClient || !user) return;
    // Montant facture EDF
    let montantFactureEDF = '';
    if (formRapide.factureEdf === '30-90') montantFactureEDF = '30-90';
    if (formRapide.factureEdf === '90-150') montantFactureEDF = '90-150';
    if (formRapide.factureEdf === '150-250') montantFactureEDF = '150-250';
    if (formRapide.factureEdf === '250plus') montantFactureEDF = '+250';
    // Surface toiture
    let surfaceToiture = '';
    if (formRapide.surfaceToiture === '20-50') surfaceToiture = '20-50';
    if (formRapide.surfaceToiture === '50-120') surfaceToiture = '50-120';
    if (formRapide.surfaceToiture === '120plus') surfaceToiture = '+120';
    // Eléments conso
    const elementsConso = [];
    if (formRapide.consoPiscine) elementsConso.push('Piscine');
    if (formRapide.consoClim) elementsConso.push('Clims');
    if (formRapide.consoResistance) elementsConso.push('Résistance');
    if (formRapide.consoJacuzzi) elementsConso.push('Jacuzzi');
    if (formRapide.consoVoiture) elementsConso.push('Voiture électrique');
    if (formRapide.consoAutres) elementsConso.push('Autres');
    // Ajout Firestore
    const managerEmail = formRapide.emailManager || user.email;
    const clientRef = await addDoc(collection(db, 'clients'), {
      nom: formRapide.nom,
      prenom: formRapide.prenom,
      adresse: formRapide.adresseClient,
      telephone: formRapide.telClient,
      montantFactureEDF,
      surfaceToiture,
      elementsConso,
      professionMR: formRapide.professionMR,
      ageMR: formRapide.ageMR,
      professionMME: formRapide.professionMME,
      ageMME: formRapide.ageMME,
      emailManager: managerEmail,
      emailCommercial: user.email, // accès commercial
      email: '', // champ vide car non demandé
      ville: '', // champ vide car non demandé
      statut: 'En cours',
      Etude: [],
      docs: {},
      debrief: { bien: '', moinsBien: '', ressenti: '', venteEffectuee: '' },
      rdvFait: false,
      dateRdvPris: new Date().toISOString().slice(0, 10), // Date de prise de RDV pour stats équipe
    });
    // Mise à jour stats équipe pour RDV pris
    const moisActuel = new Date().toISOString().slice(0, 7);
    // Stat du commercial (celui qui ajoute)
    const statsId = `${user.email}_${moisActuel}`;
    const statsRef = doc(db, 'statsVendeurs', statsId);
    try {
      await updateDoc(statsRef, { nbRdvPris: increment(1) });
    } catch (e) {
      await setDoc(statsRef, { email: user.email, mois: moisActuel, nbRdvPris: 1 });
    }
    // Stat du manager (toujours incrémentée)
    const statsManagerId = `${managerEmail}_${moisActuel}`;
    const statsManagerRef = doc(db, 'statsVendeurs', statsManagerId);
    try {
      await updateDoc(statsManagerRef, { nbRdvPris: increment(1) });
    } catch (e) {
      await setDoc(statsManagerRef, { email: managerEmail, mois: moisActuel, nbRdvPris: 1 });
    }
    // Stat générale
    const statsGeneralId = `general_${moisActuel}`;
    const statsGeneralRef = doc(db, 'statsVendeurs', statsGeneralId);
    try {
      await updateDoc(statsGeneralRef, { nbRdvPris: increment(1) });
    } catch (e) {
      await setDoc(statsGeneralRef, { mois: moisActuel, nbRdvPris: 1 });
    }
    // Reset form
    setFormRapide({
      factureEdf: '',
      surfaceToiture: '',
      consoPiscine: false,
      consoClim: false,
      consoResistance: false,
      consoJacuzzi: false,
      consoVoiture: false,
      consoAutres: false,
      professionMR: '',
      ageMR: '',
      professionMME: '',
      ageMME: '',
      nom: '',
      prenom: '',
      adresseClient: '',
      telClient: '',
    });
    // Refresh clients et met le dernier en haut
    const q = query(collection(db, 'clients'), where('emailManager', '==', user.email));
    const snap = await getDocs(q);
    const refreshed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setClients([...refreshed].reverse());
  };

  const handleAjoutClient = async (e) => {
    e.preventDefault();
    if (nouveauClient.nom && nouveauClient.prenom && nouveauClient.adresse && nouveauClient.ville && nouveauClient.email && nouveauClient.telephone && user) {
      const clientRef = await addDoc(collection(db, 'clients'), {
        ...nouveauClient,
        emailManager: user.email,
        emailCommercial: user.email, // accès commercial
        rdvFait: false,
        dateRdvPris: new Date().toISOString().slice(0, 10), // Date de prise de RDV pour stats équipe
      });
      // Mise à jour stats équipe pour RDV pris
      const moisActuel = new Date().toISOString().slice(0, 7);
      // Stat du commercial (celui qui ajoute)
      const statsId = `${user.email}_${moisActuel}`;
      const statsRef = doc(db, 'statsVendeurs', statsId);
      try {
        await updateDoc(statsRef, { nbRdvPris: increment(1) });
      } catch (e) {
        await setDoc(statsRef, { email: user.email, mois: moisActuel, nbRdvPris: 1 });
      }
      // Stat du manager (si différent du commercial)
      const managerEmail = user.email; // dans ce formulaire, manager = user
      // Stat générale
      const statsGeneralId = `general_${moisActuel}`;
      const statsGeneralRef = doc(db, 'statsVendeurs', statsGeneralId);
      try {
        await updateDoc(statsGeneralRef, { nbRdvPris: increment(1) });
      } catch (e) {
        await setDoc(statsGeneralRef, { mois: moisActuel, nbRdvPris: 1 });
      }
      setNouveauClient({
        nom: '',
        prenom: '',
        adresse: '',
        ville: '',
        email: '',
        telephone: '',
        montantFactureEDF: '',
        ageMR: '',
        ageMME: '',
        professionMR: '',
        professionMME: '',
      });
      const q = query(collection(db, 'clients'), where('emailManager', '==', user.email));
      const snap = await getDocs(q);
      const refreshed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  const handleEditClient = (client) => {
    setEditId(client.id);
    setEditClient({ ...client });
  };

  const handleChangeEditClient = (e) => {
    setEditClient({ ...editClient, [e.target.name]: e.target.value });
  };

  const handleSaveEditClient = async (e) => {
    e.preventDefault();
    if (editId && editClient) {
      await updateDoc(doc(db, 'clients', editId), editClient);
      setEditId(null);
      setEditClient(null);
      const q = query(collection(db, 'clients'), where('emailManager', '==', user.email));
      const snap = await getDocs(q);
      const refreshed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      await deleteDoc(doc(db, 'clients', id));
      setClients(clients.filter(c => c.id !== id)); // Pas besoin de reverse ici, la suppression conserve l'ordre
    }
  };

  const handleFileChange = async (clientId, type, file) => {
    if (!file) return;
    const storageRef = ref(storage, `clients/${clientId}/${type}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    const clientRef = doc(db, 'clients', clientId);
    const clientSnap = await getDocs(query(collection(db, 'clients'), where('id', '==', clientId)));
    let docsObj = {};
    if (clientSnap.docs.length > 0 && clientSnap.docs[0].data().docs) {
      docsObj = clientSnap.docs[0].data().docs;
    }
    docsObj[type] = url;
    await updateDoc(clientRef, { docs: docsObj });
    if (user) {
      const q = query(collection(db, 'clients'), where('emailManager', '==', user.email));
      const snap = await getDocs(q);
      const refreshed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  const handleDebriefChange = (e) => {
    setDebrief({ ...debrief, [e.target.name]: e.target.value });
  };
  const handleDebriefSave = async (clientId) => {
    await updateDoc(doc(db, 'clients', clientId), { debrief });
    setShowDebriefId(null);
    if (user) {
      const q = query(collection(db, 'clients'), where('emailManager', '==', user.email));
      const snap = await getDocs(q);
      const refreshed = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  // Affiche la page pour tous les utilisateurs connectés
  return (
    <div style={{ padding: 40 }}>
      <h2>Mes clients</h2>
      {user && (
        <div style={{ marginBottom: 12, color: '#64748b', fontSize: 15 }}>
          <b>Utilisateur connecté :</b> {user.email}
        </div>
      )}
      {/* Onglets pour switcher entre manager/admin et commerciaux */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('me')}
          style={{
            padding: '8px 18px',
            background: activeTab === 'me' ? '#2563eb' : '#e5e7eb',
            color: activeTab === 'me' ? '#fff' : '#334155',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
          }}
        >
          Moi ({user?.email})
        </button>
        {commerciaux.map((c) => {
          const hasName = (c.nom && c.nom.trim()) || (c.prenom && c.prenom.trim());
          return (
            <button
              key={c.email}
              onClick={() => setActiveTab(c.email)}
              style={{
                padding: '8px 18px',
                background: activeTab === c.email ? '#2563eb' : '#e5e7eb',
                color: activeTab === c.email ? '#fff' : '#334155',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              {hasName ? `${c.nom || ''} ${c.prenom || ''}`.trim() + ` (${c.email})` : c.email}
            </button>
          );
        })}
      </div>
      <form onSubmit={handleAjoutClient} style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <input type="text" name="nom" placeholder="Nom" value={nouveauClient.nom} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} required />
        <input type="text" name="prenom" placeholder="Prénom" value={nouveauClient.prenom} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} required />
        <input type="text" name="adresse" placeholder="Adresse" value={nouveauClient.adresse} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '2 1 300px' }} required />
        <input type="text" name="ville" placeholder="Ville" value={nouveauClient.ville} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} required />
        <input type="email" name="email" placeholder="Adresse mail" value={nouveauClient.email} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 220px' }} required />
        <input type="tel" name="telephone" placeholder="Numéro de téléphone" value={nouveauClient.telephone} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} required />
        <input type="number" name="montantFactureEDF" placeholder="Montant facture EDF (€)" value={nouveauClient.montantFactureEDF} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} />
        <input type="number" name="ageMR" placeholder="Âge de MR" value={nouveauClient.ageMR} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 120px' }} />
        <input type="number" name="ageMME" placeholder="Âge de Mme" value={nouveauClient.ageMME} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 120px' }} />
        <input type="text" name="professionMR" placeholder="Profession de MR" value={nouveauClient.professionMR} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} />
        <input type="text" name="professionMME" placeholder="Profession de Mme" value={nouveauClient.professionMME} onChange={handleChangeClient} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, flex: '1 1 180px' }} />
        <button type="submit" style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer', flex: '1 1 120px' }}>
          Ajouter
        </button>
      </form>
    {/* Formulaire simplifié pour prise rapide au téléphone */}
    <form style={{ marginBottom: 32, background: '#f8fafc', padding: 18, borderRadius: 8, boxShadow: '0 2px 8px #2563eb22', maxWidth: 700 }}>
      <h3 style={{ marginBottom: 12, color: '#2563eb' }}>Prise rapide infos client (téléphone)</h3>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Facture EDF :</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {factureEdfOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelectOption('factureEdf', opt.value)}
              style={{
                minWidth: 110,
                padding: '10px 18px',
                borderRadius: 8,
                border: formRapide.factureEdf === opt.value ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: formRapide.factureEdf === opt.value ? '#dbeafe' : '#fff',
                color: formRapide.factureEdf === opt.value ? '#2563eb' : '#334155',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: formRapide.factureEdf === opt.value ? '0 2px 8px #2563eb22' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Metres carrés sur la toiture :</label>
        <div style={{ display: 'flex', gap: 12 }}>
          {surfaceToitureOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelectOption('surfaceToiture', opt.value)}
              style={{
                minWidth: 110,
                padding: '10px 18px',
                borderRadius: 8,
                border: formRapide.surfaceToiture === opt.value ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: formRapide.surfaceToiture === opt.value ? '#dbeafe' : '#fff',
                color: formRapide.surfaceToiture === opt.value ? '#2563eb' : '#334155',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: formRapide.surfaceToiture === opt.value ? '0 2px 8px #2563eb22' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Éléments à forte conso :</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {elementsConsoList.map(el => (
            <button
              key={el.key}
              type="button"
              onClick={() => handleToggleConso(el.key)}
              style={{
                minWidth: 120,
                padding: '10px 18px',
                borderRadius: 8,
                border: formRapide[el.key] ? '2px solid #2563eb' : '1px solid #d1d5db',
                background: formRapide[el.key] ? '#dbeafe' : '#fff',
                color: formRapide[el.key] ? '#2563eb' : '#334155',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: formRapide[el.key] ? '0 2px 8px #2563eb22' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {el.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Profession MR :</label><br />
          <input type="text" name="professionMR" value={formRapide.professionMR} onChange={handleChangeFormRapide} placeholder="Profession MR" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 160 }} />
        </div>
        <div>
          <label style={{ fontWeight: 600 }}>Âge MR :</label><br />
          <input type="number" name="ageMR" value={formRapide.ageMR} onChange={handleChangeFormRapide} placeholder="Âge MR" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 80 }} />
        </div>
      </div>
      <div style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Profession Mme :</label><br />
          <input type="text" name="professionMME" value={formRapide.professionMME} onChange={handleChangeFormRapide} placeholder="Profession Mme" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 160 }} />
        </div>
        <div>
          <label style={{ fontWeight: 600 }}>Âge Mme :</label><br />
          <input type="number" name="ageMME" value={formRapide.ageMME} onChange={handleChangeFormRapide} placeholder="Âge Mme" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 80 }} />
        </div>
      </div>
      <div style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
        <div>
          <label style={{ fontWeight: 600 }}>Nom du client :</label><br />
          <input type="text" name="nom" value={formRapide.nom} onChange={handleChangeFormRapide} placeholder="Nom" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 140 }} />
        </div>
        <div>
          <label style={{ fontWeight: 600 }}>Prénom du client :</label><br />
          <input type="text" name="prenom" value={formRapide.prenom} onChange={handleChangeFormRapide} placeholder="Prénom" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 140 }} />
        </div>
        <div>
          <label style={{ fontWeight: 600 }}>Manager :</label><br />
          <select name="emailManager" value={formRapide.emailManager || user?.email} onChange={handleChangeFormRapide} style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 220 }}>
            {managers.map(m => (
              <option key={m.email} value={m.email}>{(m.nom || '') + ' ' + (m.prenom || '')} ({m.email})</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600 }}>Adresse du client :</label><br />
        <input type="text" name="adresseClient" value={formRapide.adresseClient} onChange={handleChangeFormRapide} placeholder="Adresse" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 260 }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontWeight: 600 }}>Numéro de téléphone :</label><br />
        <input type="text" name="telClient" value={formRapide.telClient} onChange={handleChangeFormRapide} placeholder="Numéro de téléphone" style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, width: 260 }} />
      </div>
      <button type="button" onClick={handleEnregistrerRapide} style={{ padding: '8px 18px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 16, cursor: 'pointer', marginTop: 8 }}>Enregistrer infos rapide</button>
    </form>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {/* Filtrage selon l'onglet actif */}
          {clients.filter(client => {
            if (activeTab === 'me') {
              // Manager/admin : clients dont emailManager === user.email && emailCommercial === user.email
              return client.emailManager === user.email && client.emailCommercial === user.email;
            } else {
              // Commercial sélectionné : clients dont emailCommercial === activeTab
              return client.emailCommercial === activeTab;
            }
          }).length === 0 && (
            <li style={{ color: '#ef4444', fontWeight: 600 }}>
              Aucun client attribué.<br />
              <span style={{ fontWeight: 400, color: '#64748b' }}>
                Vérifie que tes clients dans Firestore ont bien le champ <b>emailManager</b> ou <b>emailCommercial</b>.<br />
                (Sinon, ajoute un client avec le formulaire ci-dessus pour tester)
              </span>
            </li>
          )}
          {clients.filter(client => {
            if (activeTab === 'me') {
              return client.emailManager === user.email && client.emailCommercial === user.email;
            } else {
              return client.emailCommercial === activeTab;
            }
          }).map((client) => (
            <li key={client.id} style={{ background: '#f1f5f9', borderRadius: 8, padding: 14, marginBottom: 10 }}>
              {editId === client.id ? (
                <form onSubmit={handleSaveEditClient} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <input type="text" name="nom" placeholder="Nom" value={editClient.nom} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} required />
                  <input type="text" name="prenom" placeholder="Prénom" value={editClient.prenom} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} required />
                  <input type="text" name="adresse" placeholder="Adresse" value={editClient.adresse} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} required />
                  <input type="text" name="ville" placeholder="Ville" value={editClient.ville} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} required />
                  <input type="email" name="email" placeholder="Adresse mail" value={editClient.email} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} required />
                  <input type="tel" name="telephone" placeholder="Numéro de téléphone" value={editClient.telephone} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} required />
                  <input type="number" name="montantFactureEDF" placeholder="Montant facture EDF (€)" value={editClient.montantFactureEDF} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} />
                  <input type="number" name="ageMR" placeholder="Âge de MR" value={editClient.ageMR} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} />
                  <input type="number" name="ageMME" placeholder="Âge de Mme" value={editClient.ageMME} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} />
      {commerciaux.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {commerciaux.map((c) => {
            const hasName = (c.nom && c.nom.trim()) || (c.prenom && c.prenom.trim());
            return (
              <button
                key={c.email}
                onClick={() => setActiveTab(c.email)}
                style={{
                  padding: '8px 18px',
                  background: activeTab === c.email ? '#2563eb' : '#e5e7eb',
                  color: activeTab === c.email ? '#fff' : '#334155',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {hasName ? `${c.nom || ''} ${c.prenom || ''}`.trim() + ` (${c.email})` : c.email}
              </button>
            );
          })}
        </div>
      )}
                  <input type="text" name="professionMR" placeholder="Profession de MR" value={editClient.professionMR} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} />
                  <input type="text" name="professionMME" placeholder="Profession de Mme" value={editClient.professionMME} onChange={handleChangeEditClient} style={{ padding: 6, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 15 }} />
                  <button type="submit" style={{ padding: '6px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Enregistrer</button>
                  <button type="button" onClick={() => { setEditId(null); setEditClient(null); }} style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Annuler</button>
                </form>
              ) : (
                <>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{client.nom} {client.prenom}</div>
                  <div style={{ margin: '8px 0' }}>
                    <label style={{ fontWeight: 500, fontSize: 15 }}>
                      RDV fait :
                      <input
                        type="checkbox"
                        checked={!!client.rdvFait}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          await updateDoc(doc(db, 'clients', client.id), { rdvFait: checked });
                          setClients(clients.map(c => c.id === client.id ? { ...c, rdvFait: checked } : c));
                          // Si on coche (RDV fait passe de false à true), on incrémente nbRdvFait
                          if (checked && !client.rdvFait) {
                            const moisActuel = new Date().toISOString().slice(0, 7);
                            // Stat du commercial
                            const commercialEmail = client.emailCommercial || user?.email;
                            const statsId = `${commercialEmail}_${moisActuel}`;
                            const statsRef = doc(db, 'statsVendeurs', statsId);
                            try {
                              await updateDoc(statsRef, { nbRdvFait: increment(1) });
                            } catch (e) {
                              await setDoc(statsRef, { email: commercialEmail, mois: moisActuel, nbRdvFait: 1 });
                            }
                            // Stat du manager
                            const managerEmail = client.emailManager || user?.email;
                            const statsManagerId = `${managerEmail}_${moisActuel}`;
                            const statsManagerRef = doc(db, 'statsVendeurs', statsManagerId);
                            try {
                              await updateDoc(statsManagerRef, { nbRdvFait: increment(1) });
                            } catch (e) {
                              await setDoc(statsManagerRef, { email: managerEmail, mois: moisActuel, nbRdvFait: 1 });
                            }
                            // Stat générale
                            const statsGeneralId = `general_${moisActuel}`;
                            const statsGeneralRef = doc(db, 'statsVendeurs', statsGeneralId);
                            try {
                              await updateDoc(statsGeneralRef, { nbRdvFait: increment(1) });
                            } catch (e) {
                              await setDoc(statsGeneralRef, { mois: moisActuel, nbRdvFait: 1 });
                            }
                          }
                        }}
                        style={{ marginLeft: 8 }}
                      />
                    </label>
                  </div>
                  <div style={{ color: '#64748b', marginBottom: 4 }}>{client.email} | {client.telephone}</div>
                  <div style={{ fontSize: 15 }}>{client.adresse}, {client.ville}</div>
                  <div style={{ fontSize: 15 }}>Facture EDF: {client.montantFactureEDF} €</div>
                  <div style={{ fontSize: 15 }}>Âge MR: {client.ageMR} | Âge Mme: {client.ageMME}</div>
                  <div style={{ fontSize: 15 }}>Profession MR: {client.professionMR} | Profession Mme: {client.professionMME}</div>
                  {/* Affichage des études associées au client */}
                  {Array.isArray(client.Etude) && client.Etude.length > 0 && (
                    <div style={{ background: '#e0f2fe', borderRadius: 8, padding: 12, marginTop: 10 }}>
                      <h4 style={{ marginBottom: 8 }}>Études assignées</h4>
                      {client.Etude.map((etude, idx) => (
                        <div key={idx} style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 6, boxShadow: '0 2px 8px #2563eb22' }}>
                          <div style={{ fontWeight: 600, color: '#2563eb', marginBottom: 4 }}>Étude du {new Date(etude.date).toLocaleDateString('fr-FR')}</div>
                          <div>Production estimée à l'année : <b>{etude.prodMoyenneKwh} kWh</b></div>
                          <div>KWh consommés à l'année : <b>{etude.conso} kWh</b></div>
                          <div>Prime EDF : <b>{etude.prime} €</b></div>
                          <div>Année de rentabilité : <b>{etude.anneeRentable || etude.nbAnneesRentable || '-'}</b></div>
                          {/* Tableau de rentabilité si dispo */}
                          {etude.renta && Array.isArray(etude.renta) && (
                            <div style={{ marginTop: 8 }}>
                              <b>Tableau de rentabilité :</b>
                              <table style={{ width: '100%', marginTop: 4, borderCollapse: 'collapse', fontSize: 14 }}>
                                <thead>
                                  <tr style={{ background: '#e0e7ff' }}>
                                    <th style={{ padding: 4, border: '1px solid #c7d2fe' }}>Année</th>
                                    <th style={{ padding: 4, border: '1px solid #c7d2fe' }}>Gain</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {etude.renta.map((row, i) => (
                                    <tr key={i}>
                                      <td style={{ padding: 4, border: '1px solid #c7d2fe' }}>{row.annee}</td>
                                      <td style={{ padding: 4, border: '1px solid #c7d2fe' }}>{row.gain} €</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button onClick={() => handleEditClient(client)} style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Modifier</button>
                    <button onClick={() => handleDeleteClient(client.id)} style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Supprimer</button>
                    <button onClick={() => setShowUploadId(showUploadId === client.id ? null : client.id)} style={{ padding: '6px 14px', background: '#f59e42', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Importer des docs</button>
                    <button onClick={() => { setShowDebriefId(client.id); setDebrief(client.debrief || { bien: '', moinsBien: '', ressenti: '', venteEffectuee: '' }); }} style={{ padding: '6px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Débrief RDV</button>
                    {client.statut === 'Vendu' ? (
                      <button onClick={() => handleAnnulerVente(client.id)} style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Annuler vente</button>
                    ) : (
                      <button onClick={() => handleVendu(client.id)} style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Vendu</button>
                    )}
                  </div>
                  {showDebriefId === client.id && (
                    <div style={{ background: '#eef2ff', borderRadius: 8, padding: 16, marginTop: 10 }}>
                      <h4 style={{ marginBottom: 10 }}>Débrief RDV</h4>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontWeight: 500 }}>Qu'est-ce qui s'est bien passé ?</label><br />
                        <textarea name="bien" value={debrief.bien} onChange={handleDebriefChange} style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #c7d2fe', marginTop: 4 }} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontWeight: 500 }}>Qu'est-ce qui s'est moins bien passé ?</label><br />
                        <textarea name="moinsBien" value={debrief.moinsBien} onChange={handleDebriefChange} style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #c7d2fe', marginTop: 4 }} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontWeight: 500 }}>Ressenti sur la vente</label><br />
                        <textarea name="ressenti" value={debrief.ressenti} onChange={handleDebriefChange} style={{ width: '100%', minHeight: 40, borderRadius: 6, border: '1px solid #c7d2fe', marginTop: 4 }} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontWeight: 500 }}>Est-ce que la vente a été effectuée ?</label><br />
                        <select name="venteEffectuee" value={debrief.venteEffectuee} onChange={handleDebriefChange} style={{ width: '100%', borderRadius: 6, border: '1px solid #c7d2fe', marginTop: 4 }}>
                          <option value="">Sélectionner</option>
                          <option value="oui">Oui</option>
                          <option value="non">Non</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => handleDebriefSave(client.id)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
                        <button onClick={() => setShowDebriefId(null)} style={{ background: '#e5e7eb', color: '#334155', border: 'none', borderRadius: 6, padding: '6px 14px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                      </div>
                    </div>
                  )}
                  {showUploadId === client.id && (
                    <div style={{ background: '#fff7ed', borderRadius: 8, padding: 14, marginTop: 10 }}>
                      <h4 style={{ marginBottom: 10 }}>Importer des documents</h4>
                      {docTypes.map((type) => (
                        <div
                          key={type}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginBottom: 8,
                            border: dragOverType === type ? '2px dashed #2563eb' : '1px solid #e5e7eb',
                            background: dragOverType === type ? '#dbeafe' : undefined,
                            borderRadius: 6,
                            padding: '6px 0',
                          }}
                          onDragOver={e => { e.preventDefault(); setDragOverType(type); }}
                          onDragLeave={e => { e.preventDefault(); setDragOverType(null); }}
                          onDrop={e => {
                            e.preventDefault();
                            setDragOverType(null);
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                              handleFileChange(client.id, type, e.dataTransfer.files[0]);
                            }
                          }}
                        >
                          <span style={{ minWidth: 140 }}>{type}</span>
                          <input
                            type="file"
                            style={{ flex: 1 }}
                            onChange={e => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChange(client.id, type, e.target.files[0]);
                              }
                            }}
                          />
                          {client.docs && client.docs[type] ? (
                            <a href={client.docs[type]} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontSize: 13, marginLeft: 8 }}>Voir le doc</a>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: 13 }}>
                              {dragOverType === type ? 'Dépose ton fichier ici !' : 'Cliquer ou glisser-déposer'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
