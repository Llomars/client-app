import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

const storage = getStorage();

// --- Liste des kits (centrales) ---
const kits = [
  { label: '3 KWh 0', value: '3KWh-0', prix: 7500 },
  { label: '3 KWh 1', value: '3KWh-1', prix: 9500 },
  { label: '6 KWh 0', value: '6KWh-0', prix: 12000 },
  { label: '6 KWh 1', value: '6KWh-1', prix: 15000 },
  { label: '6 KWh 2', value: '6KWh-2', prix: 16000 },
  { label: '9 KWh 0', value: '9KWh-0', prix: 16500 },
  { label: '9 KWh 1', value: '9KWh-1', prix: 22000 },
  { label: '9 KWh 2', value: '9KWh-2', prix: 24000 },
  { label: '12 KWh 0', value: '12KWh-0', prix: 22000 },
  { label: '12 KWh 2', value: '12KWh-2', prix: 30000 },
];

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
    setFormRapide((prev) => ({ ...prev, [name]: value }));
  };
  const [commerciaux, setCommerciaux] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
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
    setFormRapide((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [user, setUser] = useState(null);

  const [userRole, setUserRole] = useState(null);
  // const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editClient, setEditClient] = useState(null);
  const [showUploadId, setShowUploadId] = useState(null);
  const [showDebriefId, setShowDebriefId] = useState(null);
  const [showFicheClientId, setShowFicheClientId] = useState(null);
  const [debrief, setDebrief] = useState({
    bien: '',
    moinsBien: '',
    ressenti: '',
    venteEffectuee: '',
  });
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
    setClients(
      clients.map((c) => (c.id === id ? { ...c, statut: 'Vendu' } : c))
    );
  };
  const handleAnnulerVente = async (id) => {
    await updateDoc(doc(db, 'clients', id), { statut: 'En cours' });
    setClients(
      clients.map((c) => (c.id === id ? { ...c, statut: 'En cours' } : c))
    );
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
      // Récupère tous les commerciaux attribués au manager
      const commerciauxSnap = await getDocs(
        query(collection(db, 'users'), where('managerEmail', '==', user.email))
      );
      const commerciauxList = commerciauxSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCommerciaux(commerciauxList);
      // Récupère tous les clients selon le rôle
      let clientsSnap;
      if (userRole === 'commercial') {
        clientsSnap = await getDocs(
          query(
            collection(db, 'clients'),
            where('emailCommercial', '==', user.email)
          )
        );
      } else {
        clientsSnap = await getDocs(
          query(
            collection(db, 'clients'),
            where('emailManager', '==', user.email)
          )
        );
      }
      let clientList = clientsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Ajoute un faux client pour chaque commercial attribué au manager (démo locale)
      if (commerciauxList.length > 0 && userRole !== 'commercial') {
        commerciauxList.forEach((comm, idx) => {
          const hasClient = clientList.some(
            (c) => c.emailManager === comm.email
          );
          if (!hasClient) {
            clientList.push({
              id: 'demo-' + comm.email,
              nom: 'Démo',
              prenom: 'Client',
              email: 'demo.client+' + idx + '@test.com',
              telephone: '060000000' + idx,
              adresse: '1 rue de la Démo',
              ville: 'DemoVille',
              montantFactureEDF: 123,
              ageMR: 40,
              ageMME: 38,
              professionMR: 'Développeur',
              professionMME: 'Designer',
              emailManager: comm.email,
              statut: 'En cours',
              Etude: [],
              docs: {},
              debrief: {
                bien: '',
                moinsBien: '',
                ressenti: '',
                venteEffectuee: '',
              },
            });
          }
        });
      }
      setClients([...clientList].reverse());
      if (commerciauxList.length > 0 && !activeTab && userRole !== 'commercial')
        setActiveTab(commerciauxList[0].email);
      // Récupère tous les managers et admins pour la sélection du manager
      const managersSnap = await getDocs(
        query(
          collection(db, 'users'),
          where('role', 'in', ['manager', 'admin'])
        )
      );
      let managersList = managersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (user) {
        managersList = [
          {
            email: user.email,
            nom: user.displayName || '',
            prenom: '',
            id: 'me',
          },
          ...managersList.filter((m) => m.email !== user.email),
        ];
      }
      setManagers(managersList);
      // Initialise l'état projet local à partir de Firestore
      const etatProjetInit = {};
      clientList.forEach((c) => {
        if (c.etatProjet) etatProjetInit[c.id] = c.etatProjet;
      });
      setEtatProjet(etatProjetInit);
    };
    fetchClientsAndCommerciaux();
  }, [user, userRole, activeTab]);

  const handleChangeClient = (e) => {
    setNouveauClient({ ...nouveauClient, [e.target.name]: e.target.value });
  };
  // Gestion du formulaire rapide
  const handleChangeFormRapide = (e) => {
    const { name, type, value, checked } = e.target;
    setFormRapide((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };
  // --- Ajout état pour message d'erreur prise rapide ---
  const [erreurRapide, setErreurRapide] = useState('');
  const handleEnregistrerRapide = async () => {
    setErreurRapide('');
    if (
      !formRapide.nom ||
      !formRapide.prenom ||
      !formRapide.adresseClient ||
      !formRapide.telClient ||
      !user
    ) {
      setErreurRapide('Merci de remplir tous les champs obligatoires.');
      return;
    }
    // Cherche le manager si commercial
    let emailManagerToUse = formRapide.emailManager || user.email;
    let debugManagerEmail = '';
    if (userRole === 'commercial') {
      const userSnap = await getDocs(
        query(collection(db, 'users'), where('email', '==', user.email))
      );
      let managerEmail = user.email;
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        if (userData.managerEmail) managerEmail = userData.managerEmail;
        debugManagerEmail = userData.managerEmail || '';
      }
      if (!debugManagerEmail) {
        setErreurRapide(
          "Aucun manager n'est attribué à ce commercial. Veuillez contacter un administrateur."
        );
        return;
      }
      emailManagerToUse = managerEmail;
    }
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
    try {
      await addDoc(collection(db, 'clients'), {
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
        emailManager: emailManagerToUse,
        emailCommercial: user.email,
        email: '',
        ville: '',
        statut: 'En cours',
        Etude: [],
        docs: {},
        debrief: { bien: '', moinsBien: '', ressenti: '', venteEffectuee: '' },
      });
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
      const q = query(
        collection(db, 'clients'),
        where('emailManager', '==', emailManagerToUse)
      );
      const snap = await getDocs(q);
      const refreshed = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    } catch (err) {
      setErreurRapide(
        "Erreur lors de l'ajout du client : " + (err.message || err)
      );
    }
  };

  // --- Ajout état pour message d'erreur ---
  const [ajoutErreur, setAjoutErreur] = useState('');

  const handleAjoutClient = async (e) => {
    e.preventDefault();
    setAjoutErreur('');
    if (
      nouveauClient.nom &&
      nouveauClient.prenom &&
      nouveauClient.adresse &&
      nouveauClient.ville &&
      nouveauClient.email &&
      nouveauClient.telephone &&
      user
    ) {
      let emailManagerToUse = user.email;
      let debugManagerEmail = '';
      if (userRole === 'commercial') {
        // Cherche le manager du commercial dans la collection users
        const userSnap = await getDocs(
          query(collection(db, 'users'), where('email', '==', user.email))
        );
        let managerEmail = user.email;
        if (!userSnap.empty) {
          const userData = userSnap.docs[0].data();
          if (userData.managerEmail) managerEmail = userData.managerEmail;
          debugManagerEmail = userData.managerEmail || '';
        }
        if (!debugManagerEmail) {
          setAjoutErreur(
            "Aucun manager n'est attribué à ce commercial. Veuillez contacter un administrateur."
          );
          return;
        }
        emailManagerToUse = managerEmail;
      }
      try {
        // DEBUG: Affiche la valeur récupérée pour managerEmail
        console.log(
          'DEBUG managerEmail utilisé pour le client:',
          emailManagerToUse,
          'managerEmail Firestore:',
          debugManagerEmail
        );
        await addDoc(collection(db, 'clients'), {
          ...nouveauClient,
          emailManager: emailManagerToUse,
          emailCommercial: user.email, // accès commercial
        });
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
        let q;
        if (userRole === 'commercial') {
          q = query(
            collection(db, 'clients'),
            where('emailCommercial', '==', user.email)
          );
        } else {
          q = query(
            collection(db, 'clients'),
            where('emailManager', '==', user.email)
          );
        }
        const snap = await getDocs(q);
        const refreshed = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients([...refreshed].reverse());
      } catch (err) {
        setAjoutErreur(
          "Erreur lors de l'ajout du client : " + (err.message || err)
        );
      }
    } else {
      setAjoutErreur('Merci de remplir tous les champs obligatoires.');
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
      const q = query(
        collection(db, 'clients'),
        where('emailManager', '==', user.email)
      );
      const snap = await getDocs(q);
      const refreshed = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Supprimer ce client ?')) {
      await deleteDoc(doc(db, 'clients', id));
      setClients(clients.filter((c) => c.id !== id)); // Pas besoin de reverse ici, la suppression conserve l'ordre
    }
  };

  // --- AJOUT ÉTUDE PERSO ---
  const [showEtudePersoId, setShowEtudePersoId] = useState(null);
  const [etudePerso, setEtudePerso] = useState(null);
  // Ajout profil client
  const profilOptions = [
    { key: 'economie', label: 'Économie' },
    { key: 'autonomie', label: 'Autonomie' },
    { key: 'ecologie', label: 'Écologie' },
    { key: 'revente', label: 'Revente de surplus' },
    { key: 'plusValue', label: 'Plus-value immobilière' },
    { key: 'primeEDF', label: 'Prime EDF' },
  ];
  const handleToggleProfil = (key) => {
    setEtudePerso((prev) => {
      const selected = prev.profilClient || [];
      if (selected.includes(key)) {
        // Retire la case
        return { ...prev, profilClient: selected.filter((k) => k !== key) };
      } else {
        // Ajoute si moins de 3
        if (selected.length < 3) {
          return { ...prev, profilClient: [...selected, key] };
        } else {
          return prev;
        }
      }
    });
  };

  const handleOpenEtudePerso = (client) => {
    setShowEtudePersoId(client.id);
    if (client.etudePerso) {
      setEtudePerso({ ...etudePerso, ...client.etudePerso });
    } else {
      setEtudePerso({
        four: false,
        tele: false,
        plaque: false,
        frigo: 1,
        congelateur: false,
        clims: 0,
        piscine: false,
        pompeChaleur: false,
        jacuzzi: false,
        voitureElec: false,
        caveVin: false,
        consolesPc: false,
        brasseurAir: 0,
        autres: '',
        profilClient: [],
      });
    }
  };
  const handleChangeEtudePerso = (key, value) => {
    setEtudePerso((prev) => ({ ...prev, [key]: value }));
  };
  const handleSaveEtudePerso = async (clientId) => {
    await updateDoc(doc(db, 'clients', clientId), { etudePerso });
    setShowEtudePersoId(null);
    if (user) {
      let q;
      if (userRole === 'commercial') {
        q = query(
          collection(db, 'clients'),
          where('emailCommercial', '==', user.email)
        );
      } else {
        q = query(
          collection(db, 'clients'),
          where('emailManager', '==', user.email)
        );
      }
      const snap = await getDocs(q);
      const refreshed = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  // --- GESTION ÉTAT PROJET ---
  const [showEtatProjetId, setShowEtatProjetId] = useState(null);
  const [etatProjet, setEtatProjet] = useState({});

  // Handler pour ouvrir la modal Etat projet
  const handleOpenEtatProjet = (clientId) => {
    setShowEtatProjetId(clientId);
    const client = clients.find((c) => c.id === clientId);
    const firestoreEtat = client?.etatProjet || {};
    // Normalise toutes les valeurs (boolean ou string), mais conserve les dates si présentes
    const normalizedEtat =
      Object.keys(firestoreEtat).length > 0
        ? {
            ...firestoreEtat,
            rdvFait:
              firestoreEtat.rdvFait === true ||
              firestoreEtat.rdvFait === 'true' ||
              firestoreEtat.rdvFait === 1 ||
              firestoreEtat.rdvFait === '1',
            attente:
              firestoreEtat.attente === true ||
              firestoreEtat.attente === 'true' ||
              firestoreEtat.attente === 1 ||
              firestoreEtat.attente === '1',
            vendu:
              firestoreEtat.vendu === true ||
              firestoreEtat.vendu === 'true' ||
              firestoreEtat.vendu === 1 ||
              firestoreEtat.vendu === '1',
            nonVendu:
              firestoreEtat.nonVendu === true ||
              firestoreEtat.nonVendu === 'true' ||
              firestoreEtat.nonVendu === 1 ||
              firestoreEtat.nonVendu === '1',
            declarationEnCours:
              firestoreEtat.declarationEnCours === true ||
              firestoreEtat.declarationEnCours === 'true' ||
              firestoreEtat.declarationEnCours === 1 ||
              firestoreEtat.declarationEnCours === '1',
            declarationValidee:
              firestoreEtat.declarationValidee === true ||
              firestoreEtat.declarationValidee === 'true' ||
              firestoreEtat.declarationValidee === 1 ||
              firestoreEtat.declarationValidee === '1',
            installe:
              firestoreEtat.installe === true ||
              firestoreEtat.installe === 'true' ||
              firestoreEtat.installe === 1 ||
              firestoreEtat.installe === '1',
            rdvPrisDate: firestoreEtat.rdvPrisDate || '',
            rdvFaitDate: firestoreEtat.rdvFaitDate || '',
          }
        : {
            rdvFait: false,
            attente: false,
            vendu: false,
            nonVendu: false,
            declarationEnCours: false,
            declarationValidee: false,
            installe: false,
            rdvPrisDate: '',
            rdvFaitDate: '',
          };
    setEtatProjet((prev) => ({
      ...prev,
      [clientId]: normalizedEtat,
    }));
  };

  // Handler pour changer une case à cocher
  const handleChangeEtatProjet = (field, value) => {
    setEtatProjet((prev) => ({
      ...prev,
      [showEtatProjetId]: {
        ...prev[showEtatProjetId],
        [field]: value,
      },
    }));
  };

  // Handler pour sauvegarder l'état projet (corrigé pour garantir la sauvegarde des dates)
  const handleSaveEtatProjet = async (clientId) => {
    // On s'assure que les dates sont bien présentes dans l'objet à sauvegarder
    const etat = etatProjet[clientId] || {};
    const toSave = {
      ...etat,
      rdvPrisDate: etat.rdvPrisDate || '',
      rdvFaitDate: etat.rdvFaitDate || '',
    };
    await updateDoc(doc(db, 'clients', clientId), { etatProjet: toSave });
    // Si "vendu" est coché, met le statut principal à "Vendu" et ajoute la date de vente UNIQUEMENT si elle n'existe pas déjà
    const client = clients.find((c) => c.id === clientId);
    if (etat.vendu) {
      const dateVente = client?.dateVente || new Date().toISOString();
      await updateDoc(doc(db, 'clients', clientId), {
        statut: 'Vendu',
        dateVente,
      });
    } else {
      await updateDoc(doc(db, 'clients', clientId), {
        statut: 'En cours',
        dateVente: null,
      });
    }
    setShowEtatProjetId(null);
    if (user) {
      let q;
      if (userRole === 'commercial') {
        q = query(
          collection(db, 'clients'),
          where('emailCommercial', '==', user.email)
        );
      } else {
        q = query(
          collection(db, 'clients'),
          where('emailManager', '==', user.email)
        );
      }
      const snap = await getDocs(q);
      const refreshed = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClients([...refreshed].reverse());
    }
  };

  // Éléments de consommation pour étude perso
  const etudePersoElements = [
    { key: 'four', label: 'Four', type: 'bool', icon: '🍞' },
    { key: 'tele', label: 'Télé', type: 'bool', icon: '📺' },
    { key: 'plaque', label: 'Plaque électrique', type: 'bool', icon: '🍳' },
    { key: 'frigo', label: 'Frigo', type: 'number', icon: '🧊' },
    { key: 'laveVaisselle', label: 'Lave-vaisselle', type: 'bool', icon: '🍽️' },
    { key: 'machineLaver', label: 'Machine à laver', type: 'bool', icon: '🧺' },
    { key: 'congelateur', label: 'Congélateur', type: 'number', icon: '❄️' },
    { key: 'clims', label: 'Clims', type: 'number', icon: '🌬️' },
    { key: 'piscine', label: 'Piscine', type: 'bool', icon: '🏊' },
    { key: 'pompeChaleur', label: 'Pompe à chaleur', type: 'bool', icon: '🔥' },
    { key: 'jacuzzi', label: 'Jacuzzi', type: 'bool', icon: '🛁' },
    {
      key: 'voitureElec',
      label: 'Voiture électrique',
      type: 'bool',
      icon: '🚗',
    },
    { key: 'caveVin', label: 'Cave à vin', type: 'bool', icon: '🍷' },
    { key: 'consolesPc', label: 'Consoles ou PC', type: 'bool', icon: '🎮' },
    { key: 'brasseurAir', label: "Brasseur d'air", type: 'number', icon: '🌀' },
    {
      key: 'resistanceElec',
      label: 'Résistance électrique',
      type: 'bool',
      icon: '💡',
    }, // Ajouté
    { key: 'autres', label: 'Autres (champ libre)', type: 'text', icon: '✨' },
  ];

  // --- FILTRE ÉTAT PROJET ---
  const etatsProjetOptions = [
    { key: 'installe', label: 'Installé' },
    { key: 'declarationValidee', label: 'Déclaration validée' },
    { key: 'declarationEnCours', label: 'Déclaration en cours' },
    { key: 'vendu', label: 'Vendu' },
    { key: 'nonVendu', label: 'Non vendu' },
    { key: 'attente', label: 'En attente' },
    { key: 'rdvFait', label: 'RDV fait' },
  ];
  const [filtreEtatProjet, setFiltreEtatProjet] = useState([]);
  const handleToggleFiltreEtat = (key) => {
    setFiltreEtatProjet((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Affiche la page pour tous les rôles
  if (!user) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Mes clients</h2>
        <div style={{ color: '#64748b', fontSize: 16, marginTop: 32 }}>
          Connexion en cours... Veuillez patienter.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Mes clients</h2>
      {user && (
        <div style={{ marginBottom: 12, color: '#64748b', fontSize: 15 }}>
          <b>Utilisateur connecté :</b> {user.email}
        </div>
      )}
      {/* Barre de sélection des commerciaux pour managers/admins */}
      {userRole !== 'commercial' && (commerciaux.length > 0 || user) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {/* Bouton pour le manager/admin lui-même */}
          {user && (
            <button
              key={user.email}
              onClick={() => setActiveTab(user.email)}
              style={{
                padding: '8px 18px',
                background: activeTab === user.email ? '#2563eb' : '#e5e7eb',
                color: activeTab === user.email ? '#fff' : '#334155',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              {user.displayName
                ? `${user.displayName} (${user.email})`
                : user.email}
            </button>
          )}
          {/* Boutons pour chaque commercial */}
          {commerciaux.map((c) => {
            const hasName =
              (c.nom && c.nom.trim()) || (c.prenom && c.prenom.trim());
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
                {hasName
                  ? `${c.nom || ''} ${c.prenom || ''}`.trim() + ` (${c.email})`
                  : c.email}
              </button>
            );
          })}
        </div>
      )}
      {/* Formulaire d'ajout client */}
      <form
        onSubmit={handleAjoutClient}
        style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}
      >
        <input
          type="text"
          name="nom"
          placeholder="Nom"
          value={nouveauClient.nom}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
          required
        />
        <input
          type="text"
          name="prenom"
          placeholder="Prénom"
          value={nouveauClient.prenom}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
          required
        />
        <input
          type="text"
          name="adresse"
          placeholder="Adresse"
          value={nouveauClient.adresse}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '2 1 300px',
          }}
          required
        />
        <input
          type="text"
          name="ville"
          placeholder="Ville"
          value={nouveauClient.ville}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Adresse mail"
          value={nouveauClient.email}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 220px',
          }}
          required
        />
        <input
          type="tel"
          name="telephone"
          placeholder="Numéro de téléphone"
          value={nouveauClient.telephone}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
          required
        />
        <input
          type="number"
          name="montantFactureEDF"
          placeholder="Montant facture EDF (€)"
          value={nouveauClient.montantFactureEDF}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
        />
        <input
          type="number"
          name="ageMR"
          placeholder="Âge de MR"
          value={nouveauClient.ageMR}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 120px',
          }}
        />
        <input
          type="number"
          name="ageMME"
          placeholder="Âge de Mme"
          value={nouveauClient.ageMME}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 120px',
          }}
        />
        <input
          type="text"
          name="professionMR"
          placeholder="Profession de MR"
          value={nouveauClient.professionMR}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
        />
        <input
          type="text"
          name="professionMME"
          placeholder="Profession de Mme"
          value={nouveauClient.professionMME}
          onChange={handleChangeClient}
          style={{
            padding: 8,
            borderRadius: 6,
            border: '1px solid #d1d5db',
            fontSize: 16,
            flex: '1 1 180px',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px 18px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            flex: '1 1 120px',
          }}
        >
          Ajouter
        </button>
      </form>
      {ajoutErreur && (
        <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 12 }}>
          {ajoutErreur}
        </div>
      )}
      {/* Formulaire simplifié pour prise rapide au téléphone */}
      <form
        style={{
          marginBottom: 32,
          background: '#f8fafc',
          padding: 18,
          borderRadius: 8,
          boxShadow: '0 2px 8px #2563eb22',
          maxWidth: 700,
        }}
      >
        <h3 style={{ marginBottom: 12, color: '#2563eb' }}>
          Prise rapide infos client (téléphone)
        </h3>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
            Facture EDF :
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            {factureEdfOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption('factureEdf', opt.value)}
                style={{
                  minWidth: 110,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border:
                    formRapide.factureEdf === opt.value
                      ? '2px solid #2563eb'
                      : '1px solid #d1d5db',
                  background:
                    formRapide.factureEdf === opt.value ? '#dbeafe' : '#fff',
                  color:
                    formRapide.factureEdf === opt.value ? '#2563eb' : '#334155',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow:
                    formRapide.factureEdf === opt.value
                      ? '0 2px 8px #2563eb22'
                      : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
            Metres carrés sur la toiture :
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            {surfaceToitureOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectOption('surfaceToiture', opt.value)}
                style={{
                  minWidth: 110,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border:
                    formRapide.surfaceToiture === opt.value
                      ? '2px solid #2563eb'
                      : '1px solid #d1d5db',
                  background:
                    formRapide.surfaceToiture === opt.value
                      ? '#dbeafe'
                      : '#fff',
                  color:
                    formRapide.surfaceToiture === opt.value
                      ? '#2563eb'
                      : '#334155',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow:
                    formRapide.surfaceToiture === opt.value
                      ? '0 2px 8px #2563eb22'
                      : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
            Éléments à forte conso :
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {elementsConsoList.map((el) => (
              <button
                key={el.key}
                type="button"
                onClick={() => handleToggleConso(el.key)}
                style={{
                  minWidth: 120,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: formRapide[el.key]
                    ? '2px solid #2563eb'
                    : '1px solid #d1d5db',
                  background: formRapide[el.key] ? '#dbeafe' : '#fff',
                  color: formRapide[el.key] ? '#2563eb' : '#334155',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  boxShadow: formRapide[el.key]
                    ? '0 2px 8px #2563eb22'
                    : 'none',
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
            <label style={{ fontWeight: 600 }}>Profession MR :</label>
            <br />
            <input
              type="text"
              name="professionMR"
              value={formRapide.professionMR}
              onChange={handleChangeFormRapide}
              placeholder="Profession MR"
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 160,
              }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Âge MR :</label>
            <br />
            <input
              type="number"
              name="ageMR"
              value={formRapide.ageMR}
              onChange={handleChangeFormRapide}
              placeholder="Âge MR"
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 80,
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600 }}>Profession Mme :</label>
            <br />
            <input
              type="text"
              name="professionMME"
              value={formRapide.professionMME}
              onChange={handleChangeFormRapide}
              placeholder="Profession Mme"
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 160,
              }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Âge Mme :</label>
            <br />
            <input
              type="number"
              name="ageMME"
              value={formRapide.ageMME}
              onChange={handleChangeFormRapide}
              placeholder="Âge Mme"
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 80,
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
          <div>
            <label style={{ fontWeight: 600 }}>Nom du client :</label>
            <br />
            <input
              type="text"
              name="nom"
              value={formRapide.nom}
              onChange={handleChangeFormRapide}
              placeholder="Nom"
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 140,
              }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Prénom du client :</label>
            <br />
            <input
              type="text"
              name="prenom"
              value={formRapide.prenom}
              onChange={handleChangeFormRapide}
              placeholder="Prénom"
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 140,
              }}
            />
          </div>
          <div>
            <label style={{ fontWeight: 600 }}>Manager :</label>
            <br />
            <select
              name="emailManager"
              value={formRapide.emailManager || user?.email}
              onChange={handleChangeFormRapide}
              style={{
                padding: 8,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 16,
                width: 220,
              }}
            >
              {managers
                .filter(
                  (m) => userRole !== 'commercial' || m.email !== user.email
                )
                .map((m) => (
                  <option key={m.email} value={m.email}>
                    {(m.nom || '') + ' ' + (m.prenom || '')} ({m.email})
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 600 }}>Adresse du client :</label>
          <br />
          <input
            type="text"
            name="adresseClient"
            value={formRapide.adresseClient}
            onChange={handleChangeFormRapide}
            placeholder="Adresse"
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              width: 260,
            }}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontWeight: 600 }}>Numéro de téléphone :</label>
          <br />
          <input
            type="text"
            name="telClient"
            value={formRapide.telClient}
            onChange={handleChangeFormRapide}
            placeholder="Numéro de téléphone"
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              width: 260,
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleEnregistrerRapide}
          style={{
            padding: '8px 18px',
            background: '#6366f1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            fontSize: 16,
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          Enregistrer infos rapide
        </button>
        {erreurRapide && (
          <div style={{ color: '#ef4444', fontWeight: 600, marginTop: 12 }}>
            {erreurRapide}
          </div>
        )}
      </form>
      {/* Filtre par état du projet */}
      <div
        style={{
          marginBottom: 18,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600, color: '#2563eb' }}>
          Filtrer par état du projet :
        </span>
        {etatsProjetOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => handleToggleFiltreEtat(opt.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: filtreEtatProjet.includes(opt.key)
                ? '2px solid #2563eb'
                : '1px solid #d1d5db',
              background: filtreEtatProjet.includes(opt.key)
                ? '#dbeafe'
                : '#fff',
              color: filtreEtatProjet.includes(opt.key) ? '#2563eb' : '#334155',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              boxShadow: filtreEtatProjet.includes(opt.key)
                ? '0 2px 8px #2563eb22'
                : 'none',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
        {filtreEtatProjet.length > 0 && (
          <button
            type="button"
            onClick={() => setFiltreEtatProjet([])}
            style={{
              marginLeft: 8,
              color: '#ef4444',
              background: 'none',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>
      {/* Liste des clients filtrée */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {(userRole === 'commercial'
          ? clients.filter((c) => c.emailCommercial === user.email)
          : clients.filter((c) =>
              activeTab
                ? c.emailCommercial === activeTab
                : c.emailManager === user.email &&
                  c.emailCommercial === user.email
            )
        )
          // Filtrage par état du projet
          .filter((client) => {
            if (filtreEtatProjet.length === 0) return true;
            const etat = etatProjet[client.id] || {};
            return filtreEtatProjet.some((key) => etat[key]);
          }).length === 0 && (
          <li style={{ color: '#ef4444', fontWeight: 600 }}>
            Aucun client attribué.
            <br />
            <span style={{ fontWeight: 400, color: '#64748b' }}>
              Vérifie que tes clients dans Firestore ont bien le champ{' '}
              <b>
                {userRole === 'commercial' ? 'emailCommercial' : 'emailManager'}
              </b>{' '}
              égal à <b>{user.email}</b>.<br />
              (Sinon, ajoute un client avec le formulaire ci-dessus pour tester)
            </span>
          </li>
        )}
        {(userRole === 'commercial'
          ? clients.filter((c) => c.emailCommercial === user.email)
          : clients.filter((c) =>
              activeTab
                ? c.emailCommercial === activeTab
                : c.emailManager === user.email &&
                  c.emailCommercial === user.email
            )
        )
          // Filtrage par état du projet
          .filter((client) => {
            if (filtreEtatProjet.length === 0) return true;
            const etat = etatProjet[client.id] || {};
            return filtreEtatProjet.some((key) => etat[key]);
          })
          .map((client) => {
            // Récupération de l'état projet pour ce client
            const etat = etatProjet[client.id] || {};
            const etatsOrder = [
              { key: 'installe', label: 'Installé' },
              { key: 'declarationValidee', label: 'Déclaration validée' },
              { key: 'declarationEnCours', label: 'Déclaration en cours' },
              { key: 'vendu', label: 'Vendu' },
              { key: 'nonVendu', label: 'Non vendu' },
              { key: 'attente', label: 'En attente' },
              { key: 'rdvFait', label: 'RDV fait' },
            ];
            const dernierEtat = etatsOrder.find((e) => etat[e.key]);
            return (
              <li
                key={client.id}
                style={{
                  background: '#f1f5f9',
                  borderRadius: 8,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                {editId === client.id ? (
                  <form
                    onSubmit={handleSaveEditClient}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <input
                      type="text"
                      name="nom"
                      placeholder="Nom"
                      value={editClient.nom}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                      required
                    />
                    <input
                      type="text"
                      name="prenom"
                      placeholder="Prénom"
                      value={editClient.prenom}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                      required
                    />
                    <input
                      type="text"
                      name="adresse"
                      placeholder="Adresse"
                      value={editClient.adresse}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                      required
                    />
                    <input
                      type="text"
                      name="ville"
                      placeholder="Ville"
                      value={editClient.ville}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Adresse mail"
                      value={editClient.email}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                      required
                    />
                    <input
                      type="tel"
                      name="telephone"
                      placeholder="Numéro de téléphone"
                      value={editClient.telephone}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                      required
                    />
                    <input
                      type="number"
                      name="montantFactureEDF"
                      placeholder="Montant facture EDF (€)"
                      value={editClient.montantFactureEDF}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                    />
                    <input
                      type="number"
                      name="ageMR"
                      placeholder="Âge de MR"
                      value={editClient.ageMR}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                    />
                    <input
                      type="number"
                      name="ageMME"
                      placeholder="Âge de Mme"
                      value={editClient.ageMME}
                      onChange={handleChangeEditClient}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                    />
                    {commerciaux.length > 0 && (
                      <div
                        style={{ display: 'flex', gap: 8, marginBottom: 24 }}
                      >
                        {commerciaux.map((c) => {
                          const hasName =
                            (c.nom && c.nom.trim()) ||
                            (c.prenom && c.prenom.trim());
                          return (
                            <button
                              key={c.email}
                              onClick={() => setActiveTab(c.email)}
                              style={{
                                padding: '8px 18px',
                                background:
                                  activeTab === c.email ? '#2563eb' : '#e5e7eb',
                                color:
                                  activeTab === c.email ? '#fff' : '#334155',
                                border: 'none',
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 16,
                                cursor: 'pointer',
                              }}
                            >
                              {hasName
                                ? `${c.nom || ''} ${c.prenom || ''}`.trim() +
                                  ` (${c.email})`
                                : c.email}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Sélection du kit/centrale */}
                    <select
                      name="modeleCentrale"
                      value={editClient.modeleCentrale || ''}
                      onChange={(e) => {
                        const selectedKit = kits.find(
                          (k) => k.value === e.target.value
                        );
                        setEditClient({
                          ...editClient,
                          modeleCentrale: e.target.value,
                          prixCentrale: selectedKit ? selectedKit.prix : '',
                        });
                      }}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                      }}
                    >
                      <option value="">Sélectionner une centrale</option>
                      {kits.map((kit) => (
                        <option key={kit.value} value={kit.value}>
                          {kit.label} ({kit.prix} €)
                        </option>
                      ))}
                    </select>
                    {/* Champ prix modifiable */}
                    <input
                      type="number"
                      name="prixCentrale"
                      placeholder="Prix centrale (€)"
                      value={editClient.prixCentrale || ''}
                      onChange={(e) =>
                        setEditClient({
                          ...editClient,
                          prixCentrale: e.target.value,
                        })
                      }
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        fontSize: 15,
                        width: 140,
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        padding: '6px 14px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: 'pointer',
                      }}
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(null);
                        setEditClient(null);
                      }}
                      style={{
                        padding: '6px 14px',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 15,
                        cursor: 'pointer',
                      }}
                    >
                      Annuler
                    </button>
                  </form>
                ) : (
                  <>
                    <div style={{ fontWeight: 600, fontSize: 17 }}>
                      {client.nom} {client.prenom}
                    </div>
                    <div style={{ color: '#64748b', marginBottom: 4 }}>
                      {client.email} | {client.telephone}
                    </div>
                    <div style={{ fontSize: 15 }}>
                      {client.adresse}, {client.ville}
                    </div>
                    <div style={{ fontSize: 15 }}>
                      Facture EDF: {client.montantFactureEDF} €
                    </div>
                    <div style={{ fontSize: 15 }}>
                      Âge MR: {client.ageMR} | Âge Mme: {client.ageMME}
                    </div>
                    <div style={{ fontSize: 15 }}>
                      Profession MR: {client.professionMR} | Profession Mme:{' '}
                      {client.professionMME}
                    </div>
                    {/* Affichage des études associées au client */}
                    {Array.isArray(client.Etude) && client.Etude.length > 0 && (
                      <div
                        style={{
                          background: '#e0f2fe',
                          borderRadius: 8,
                          padding: 12,
                          marginTop: 10,
                        }}
                      >
                        <h4 style={{ marginBottom: 8 }}>Études assignées</h4>
                        {client.Etude.map((etude, idx) => (
                          <div
                            key={idx}
                            style={{
                              marginBottom: 12,
                              padding: 10,
                              background: '#fff',
                              borderRadius: 6,
                              boxShadow: '0 2px 8px #2563eb22',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 600,
                                color: '#2563eb',
                                marginBottom: 4,
                              }}
                            >
                              Étude du{' '}
                              {new Date(etude.date).toLocaleDateString('fr-FR')}
                            </div>
                            <div>
                              Production estimée à l'année :{' '}
                              <b>{etude.prodMoyenneKwh} kWh</b>
                            </div>
                            <div>
                              KWh consommés à l'année : <b>{etude.conso} kWh</b>
                            </div>
                            <div>
                              Prime EDF : <b>{etude.prime} €</b>
                            </div>
                            <div>
                              Année de rentabilité :{' '}
                              <b>
                                {etude.anneeRentable ||
                                  etude.nbAnneesRentable ||
                                  '-'}
                              </b>
                            </div>
                            {/* Tableau de rentabilité si dispo */}
                            {etude.renta && Array.isArray(etude.renta) && (
                              <div style={{ marginTop: 8 }}>
                                <b>Tableau de rentabilité :</b>
                                <table
                                  style={{
                                    width: '100%',
                                    marginTop: 4,
                                    borderCollapse: 'collapse',
                                    fontSize: 14,
                                  }}
                                >
                                  <thead>
                                    <tr style={{ background: '#e0e7ff' }}>
                                      <th
                                        style={{
                                          padding: 4,
                                          border: '1px solid #c7d2fe',
                                        }}
                                      >
                                        Année
                                      </th>
                                      <th
                                        style={{
                                          padding: 4,
                                          border: '1px solid #c7d2fe',
                                        }}
                                      >
                                        Gain
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {etude.renta.map((row, i) => (
                                      <tr key={i}>
                                        <td
                                          style={{
                                            padding: 4,
                                            border: '1px solid #c7d2fe',
                                          }}
                                        >
                                          {row.annee}
                                        </td>
                                        <td
                                          style={{
                                            padding: 4,
                                            border: '1px solid #c7d2fe',
                                          }}
                                        >
                                          {row.gain} €
                                        </td>
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
                    {dernierEtat ? (
                      <div
                        style={{
                          marginBottom: 8,
                          fontWeight: 600,
                          color: '#27ae60',
                          fontSize: 15,
                        }}
                      >
                        Etat projet : {dernierEtat.label}
                      </div>
                    ) : (
                      <div
                        style={{
                          marginBottom: 8,
                          fontWeight: 600,
                          color: '#64748b',
                          fontSize: 15,
                        }}
                      >
                        Etat projet : Aucun
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                      <button
                        onClick={() => handleEditClient(client)}
                        style={{
                          padding: '6px 14px',
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Supprimer
                      </button>
                      <button
                        onClick={() =>
                          setShowUploadId(
                            showUploadId === client.id ? null : client.id
                          )
                        }
                        style={{
                          padding: '6px 14px',
                          background: '#f59e42',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Importer des docs
                      </button>
                      <button
                        onClick={() => {
                          setShowDebriefId(client.id);
                          setDebrief(
                            client.debrief || {
                              bien: '',
                              moinsBien: '',
                              ressenti: '',
                              venteEffectuee: '',
                            }
                          );
                        }}
                        style={{
                          padding: '6px 14px',
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Débrief RDV
                      </button>
                      <button
                        onClick={() => handleOpenEtudePerso(client)}
                        style={{
                          padding: '6px 14px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Etude perso
                      </button>
                      <button
                        onClick={() =>
                          setShowFicheClientId(
                            showFicheClientId === client.id ? null : client.id
                          )
                        }
                        style={{
                          padding: '6px 14px',
                          background: '#0ea5e9',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Fiche client
                      </button>
                      <button
                        onClick={() => handleOpenEtatProjet(client.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#4ade80',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                        }}
                      >
                        Etat projet
                      </button>
                    </div>
                    {/* MODAL IMPORT DOCS */}
                    {showUploadId === client.id && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100vw',
                          height: '100vh',
                          background: 'rgba(30,41,59,0.65)',
                          zIndex: 1000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            background: '#fff',
                            borderRadius: 18,
                            padding: 0,
                            minWidth: 420,
                            maxWidth: 600,
                            boxShadow: '0 8px 32px #2563eb55',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              background:
                                'linear-gradient(90deg,#f59e42 60%,#2563eb 100%)',
                              color: '#fff',
                              padding: '28px 36px 18px 36px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 18,
                            }}
                          >
                            <div
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: '50%',
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px #2563eb22',
                                marginRight: 10,
                              }}
                            >
                              <span style={{ fontSize: 32, color: '#f59e42' }}>
                                📄
                              </span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 22 }}>
                                Importer des documents
                              </div>
                              <div style={{ fontSize: 15, opacity: 0.85 }}>
                                Clique ou glisse/dépose tes fichiers
                              </div>
                            </div>
                            <button
                              onClick={() => setShowUploadId(null)}
                              style={{
                                marginLeft: 'auto',
                                background: 'rgba(255,255,255,0.18)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 16px',
                                fontWeight: 600,
                                fontSize: 16,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px #2563eb22',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                          <div style={{ padding: '24px 36px 24px 36px' }}>
                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverType('all');
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                setDragOverType(null);
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                setDragOverType(null);
                                const files = Array.from(e.dataTransfer.files);
                                await handleUploadFiles(client.id, files);
                              }}
                              style={{
                                border: dragOverType
                                  ? '2px dashed #2563eb'
                                  : '2px dashed #d1d5db',
                                background: dragOverType
                                  ? '#dbeafe'
                                  : '#f8fafc',
                                borderRadius: 12,
                                padding: 32,
                                textAlign: 'center',
                                marginBottom: 18,
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 18,
                                  fontWeight: 600,
                                  marginBottom: 8,
                                }}
                              >
                                Glisse/dépose tes fichiers ici
                              </div>
                              <div
                                style={{
                                  fontSize: 15,
                                  color: '#64748b',
                                  marginBottom: 12,
                                }}
                              >
                                ou sélectionne un type de document à importer :
                              </div>
                              <input
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                id={`file-input-${client.id}`}
                                onChange={async (e) => {
                                  const files = Array.from(e.target.files);
                                  await handleUploadFiles(client.id, files);
                                }}
                              />
                              <label
                                htmlFor={`file-input-${client.id}`}
                                style={{
                                  display: 'inline-block',
                                  background: '#2563eb',
                                  color: '#fff',
                                  padding: '10px 22px',
                                  borderRadius: 8,
                                  fontWeight: 700,
                                  fontSize: 16,
                                  cursor: 'pointer',
                                  marginBottom: 12,
                                }}
                              >
                                Sélectionner des fichiers
                              </label>
                              <div
                                style={{
                                  marginTop: 18,
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 10,
                                  justifyContent: 'center',
                                }}
                              >
                                {docTypes.map((type) => (
                                  <div
                                    key={type}
                                    style={{
                                      background: '#f1f5f9',
                                      borderRadius: 8,
                                      padding: '8px 18px',
                                      fontWeight: 600,
                                      fontSize: 15,
                                      color: '#2563eb',
                                      border: '1px solid #d1d5db',
                                    }}
                                  >
                                    {type}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: 18 }}>
                              <button
                                onClick={() => setShowUploadId(null)}
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '10px 22px',
                                  fontWeight: 700,
                                  fontSize: 16,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px #ef444422',
                                }}
                              >
                                Fermer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* MODAL ÉTUDE PERSO */}
                    {showEtudePersoId && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100vw',
                          height: '100vh',
                          background: 'rgba(0,0,0,0.18)',
                          zIndex: 9999,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            background: '#fff',
                            borderRadius: 16,
                            boxShadow: '0 4px 32px #2563eb33',
                            width: '100%',
                            maxWidth: 480,
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              padding: '32px 24px 90px 24px',
                              overflowY: 'auto',
                              flex: 1,
                              minHeight: 0,
                              maxHeight: 'calc(80vh - 90px)',
                            }}
                          >
                            <h3
                              style={{
                                marginBottom: 12,
                                color: '#2563eb',
                                fontWeight: 700,
                              }}
                            >
                              Éléments de consommation
                            </h3>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 12,
                                marginBottom: 18,
                              }}
                            >
                              {etudePersoElements
                                .filter((el) => el.type === 'bool')
                                .map((el) => (
                                  <button
                                    key={el.key}
                                    type="button"
                                    onClick={() =>
                                      handleChangeEtudePerso(
                                        el.key,
                                        !etudePerso?.[el.key]
                                      )
                                    }
                                    style={{
                                      minWidth: 120,
                                      padding: '14px 18px',
                                      borderRadius: 10,
                                      border: etudePerso?.[el.key]
                                        ? '2px solid #2563eb'
                                        : '1px solid #d1d5db',
                                      background: etudePerso?.[el.key]
                                        ? '#dbeafe'
                                        : '#fff',
                                      color: etudePerso?.[el.key]
                                        ? '#2563eb'
                                        : '#334155',
                                      fontWeight: 600,
                                      fontSize: 15,
                                      cursor: 'pointer',
                                      boxShadow: etudePerso?.[el.key]
                                        ? '0 2px 8px #2563eb22'
                                        : 'none',
                                      marginBottom: 6,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                    }}
                                  >
                                    <span style={{ fontSize: 22 }}>
                                      {el.icon}
                                    </span>
                                    {el.label}
                                  </button>
                                ))}
                              <div
                                style={{
                                  display: 'flex',
                                  gap: 12,
                                  marginTop: 18,
                                }}
                              >
                                {/* Frigo */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span style={{ fontSize: 22 }}>
                                    {
                                      etudePersoElements.find(
                                        (e) => e.key === 'frigo'
                                      )?.icon
                                    }
                                  </span>
                                  <label style={{ fontWeight: 600 }}>
                                    Frigo :
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={etudePerso?.frigo || 0}
                                    onChange={(e) =>
                                      handleChangeEtudePerso(
                                        'frigo',
                                        Number(e.target.value)
                                      )
                                    }
                                    style={{
                                      width: 60,
                                      padding: 6,
                                      borderRadius: 6,
                                      border: '1px solid #d1d5db',
                                      fontSize: 15,
                                    }}
                                  />
                                </div>
                                {/* Clims */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span style={{ fontSize: 22 }}>
                                    {
                                      etudePersoElements.find(
                                        (e) => e.key === 'clims'
                                      )?.icon
                                    }
                                  </span>
                                  <label style={{ fontWeight: 600 }}>
                                    Clims :
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={etudePerso?.clims || 0}
                                    onChange={(e) =>
                                      handleChangeEtudePerso(
                                        'clims',
                                        Number(e.target.value)
                                      )
                                    }
                                    style={{
                                      width: 60,
                                      padding: 6,
                                      borderRadius: 6,
                                      border: '1px solid #d1d5db',
                                      fontSize: 15,
                                    }}
                                  />
                                </div>
                                {/* Brasseur d'air */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                  }}
                                >
                                  <span style={{ fontSize: 22 }}>
                                    {
                                      etudePersoElements.find(
                                        (e) => e.key === 'brasseurAir'
                                      )?.icon
                                    }
                                  </span>
                                  <label style={{ fontWeight: 600 }}>
                                    Brasseur d'air :
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    value={etudePerso?.brasseurAir || 0}
                                    onChange={(e) =>
                                      handleChangeEtudePerso(
                                        'brasseurAir',
                                        Number(e.target.value)
                                      )
                                    }
                                    style={{
                                      width: 60,
                                      padding: 6,
                                      borderRadius: 6,
                                      border: '1px solid #d1d5db',
                                      fontSize: 15,
                                    }}
                                  />
                                </div>
                              </div>
                              {/* Champ Autre */}
                              <div style={{ marginTop: 18 }}>
                                <label style={{ fontWeight: 600 }}>
                                  Autre élément :
                                </label>
                                <input
                                  type="text"
                                  value={etudePerso?.autres || ''}
                                  onChange={(e) =>
                                    handleChangeEtudePerso(
                                      'autres',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Saisir un autre équipement..."
                                  style={{
                                    width: '100%',
                                    padding: 8,
                                    borderRadius: 6,
                                    border: '1px solid #d1d5db',
                                    fontSize: 15,
                                  }}
                                />
                              </div>
                            </div>
                            <h4
                              style={{
                                marginBottom: 10,
                                marginTop: 18,
                                color: '#334155',
                                fontWeight: 600,
                              }}
                            >
                              Profil du client (max 3)
                            </h4>
                            <div
                              style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 12,
                                marginBottom: 18,
                              }}
                            >
                              {profilOptions.map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => handleToggleProfil(opt.key)}
                                  disabled={
                                    !etudePerso?.profilClient?.includes(
                                      opt.key
                                    ) &&
                                    (etudePerso?.profilClient?.length || 0) >= 3
                                  }
                                  style={{
                                    minWidth: 120,
                                    padding: '14px 18px',
                                    borderRadius: 10,
                                    border: etudePerso?.profilClient?.includes(
                                      opt.key
                                    )
                                      ? '2px solid #2563eb'
                                      : '1px solid #d1d5db',
                                    background:
                                      etudePerso?.profilClient?.includes(
                                        opt.key
                                      )
                                        ? '#dbeafe'
                                        : '#fff',
                                    color: etudePerso?.profilClient?.includes(
                                      opt.key
                                    )
                                      ? '#2563eb'
                                      : '#334155',
                                    fontWeight: 600,
                                    fontSize: 15,
                                    cursor: 'pointer',
                                    boxShadow:
                                      etudePerso?.profilClient?.includes(
                                        opt.key
                                      )
                                        ? '0 2px 8px #2563eb22'
                                        : 'none',
                                    opacity:
                                      !etudePerso?.profilClient?.includes(
                                        opt.key
                                      ) &&
                                      (etudePerso?.profilClient?.length || 0) >=
                                        3
                                        ? 0.6
                                        : 1,
                                    marginBottom: 6,
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              bottom: 0,
                              width: '100%',
                              background: '#fff',
                              borderTop: '1px solid #e5e7eb',

                              padding: '18px 24px',
                              display: 'flex',
                              gap: 12,
                              justifyContent: 'flex-end',
                              zIndex: 2,
                            }}
                          >
                            <button
                              onClick={() =>
                                handleSaveEtudePerso(showEtudePersoId)
                              }
                              style={{
                                padding: '8px 18px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 16,
                                cursor: 'pointer',
                              }}
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setShowEtudePersoId(null)}
                              style={{
                                padding: '8px 18px',
                                background: '#e5e7eb',
                                color: '#334155',
                                border: 'none',
                                borderRadius: 6,
                                fontWeight: 600,
                                fontSize: 16,
                                cursor: 'pointer',
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                          <button
                            onClick={() => setShowEtudePersoId(null)}
                            style={{
                              position: 'absolute',
                              top: 18,
                              right: 18,
                              background: 'none',
                              border: 'none',
                              fontSize: 22,
                              color: '#64748b',
                              cursor: 'pointer',
                              zIndex: 3,
                            }}
                            title="Fermer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}
                    {/* MODAL DEBRIEF RDV */}
                    {showDebriefId === client.id && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100vw',
                          height: '100vh',
                          background: 'rgba(30,41,59,0.65)',
                          zIndex: 1000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            background: '#fff',
                            borderRadius: 18,
                            padding: 0,
                            minWidth: 420,
                            maxWidth: 600,
                            boxShadow: '0 8px 32px #6366f155',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              background:
                                'linear-gradient(90deg,#6366f1 60%,#2563eb 100%)',
                              color: '#fff',
                              padding: '28px 36px 18px 36px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 18,
                            }}
                          >
                            <div
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: '50%',
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px #6366f122',
                                marginRight: 10,
                              }}
                            >
                              <span style={{ fontSize: 32, color: '#6366f1' }}>
                                📝
                              </span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 22 }}>
                                Débrief RDV
                              </div>
                              <div style={{ fontSize: 15, opacity: 0.85 }}>
                                Renseigne le ressenti et les points du
                                rendez-vous
                              </div>
                            </div>
                            <button
                              onClick={() => setShowDebriefId(null)}
                              style={{
                                marginLeft: 'auto',
                                background: 'rgba(255,255,255,0.18)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 16px',
                                fontWeight: 600,
                                fontSize: 16,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px #6366f122',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                          <form
                            style={{ padding: '24px 36px 24px 36px' }}
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await updateDoc(doc(db, 'clients', client.id), {
                                debrief,
                              });
                              setShowDebriefId(null);
                              // Optionnel: refresh clients
                              if (user) {
                                const q = query(
                                  collection(db, 'clients'),
                                  where('emailManager', '==', user.email)
                                );
                                const snap = await getDocs(q);
                                const refreshed = snap.docs.map((doc) => ({
                                  id: doc.id,
                                  ...doc.data(),
                                }));
                                setClients([...refreshed].reverse());
                              }
                            }}
                          >
                            <div style={{ marginBottom: 14 }}>
                              <label style={{ fontWeight: 600 }}>
                                Points positifs :
                              </label>
                              <br />
                              <textarea
                                value={debrief.bien}
                                onChange={(e) =>
                                  setDebrief((prev) => ({
                                    ...prev,
                                    bien: e.target.value,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  minHeight: 40,
                                  borderRadius: 6,
                                  border: '1px solid #d1d5db',
                                  padding: 8,
                                  fontSize: 15,
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: 14 }}>
                              <label style={{ fontWeight: 600 }}>
                                Points à améliorer :
                              </label>
                              <br />
                              <textarea
                                value={debrief.moinsBien}
                                onChange={(e) =>
                                  setDebrief((prev) => ({
                                    ...prev,
                                    moinsBien: e.target.value,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  minHeight: 40,
                                  borderRadius: 6,
                                  border: '1px solid #d1d5db',
                                  padding: 8,
                                  fontSize: 15,
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: 14 }}>
                              <label style={{ fontWeight: 600 }}>
                                Ressenti général :
                              </label>
                              <br />
                              <textarea
                                value={debrief.ressenti}
                                onChange={(e) =>
                                  setDebrief((prev) => ({
                                    ...prev,
                                    ressenti: e.target.value,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  minHeight: 40,
                                  borderRadius: 6,
                                  border: '1px solid #d1d5db',
                                  padding: 8,
                                  fontSize: 15,
                                }}
                              />
                            </div>
                            <div style={{ marginBottom: 14 }}>
                              <label style={{ fontWeight: 600 }}>
                                Vente effectuée :
                              </label>
                              <br />
                              <select
                                value={debrief.venteEffectuee}
                                onChange={(e) =>
                                  setDebrief((prev) => ({
                                    ...prev,
                                    venteEffectuee: e.target.value,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  borderRadius: 6,
                                  border: '1px solid #d1d5db',
                                  padding: 8,
                                  fontSize: 15,
                                }}
                              >
                                <option value="">Sélectionner</option>
                                <option value="oui">Oui</option>
                                <option value="non">Non</option>
                                <option value="en attente">En attente</option>
                              </select>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                gap: 12,
                                marginTop: 24,
                                justifyContent: 'flex-end',
                              }}
                            >
                              <button
                                type="submit"
                                style={{
                                  background: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '10px 22px',
                                  fontWeight: 700,
                                  fontSize: 17,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px #10b98122',
                                }}
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDebriefId(null)}
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '10px 22px',
                                  fontWeight: 700,
                                  fontSize: 17,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px #ef444422',
                                }}
                              >
                                Annuler
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                    {/* MODAL FICHE CLIENT */}
                    {showFicheClientId === client.id && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100vw',
                          height: '100vh',
                          background: 'rgba(30,41,59,0.65)',
                          zIndex: 1000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            background: '#fff',
                            borderRadius: 18,
                            padding: 0,
                            minWidth: 420,
                            maxWidth: 600,
                            boxShadow: '0 8px 32px #0ea5e955',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              background:
                                'linear-gradient(90deg,#0ea5e9 60%,#2563eb 100%)',
                              color: '#fff',
                              padding: '28px 36px 18px 36px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 18,
                            }}
                          >
                            <div
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: '50%',
                                background: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px #2563eb22',
                                marginRight: 10,
                              }}
                            >
                              <span style={{ fontSize: 32, color: '#0ea5e9' }}>
                                👤
                              </span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 22 }}>
                                Fiche client
                              </div>
                              <div style={{ fontSize: 15, opacity: 0.85 }}>
                                Récapitulatif complet du client
                              </div>
                            </div>
                            <button
                              onClick={() => setShowFicheClientId(null)}
                              style={{
                                marginLeft: 'auto',
                                background: 'rgba(255,255,255,0.18)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                padding: '8px 16px',
                                fontWeight: 600,
                                fontSize: 16,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px #2563eb22',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                          <div style={{ padding: '24px 36px 24px 36px' }}>
                            <h4 style={{ marginBottom: 10, color: '#2563eb' }}>
                              Infos client
                            </h4>
                            <div>
                              <b>Nom:</b> {client.nom}
                            </div>
                            <div>
                              <b>Prénom:</b> {client.prenom}
                            </div>
                            <div>
                              <b>Email:</b> {client.email}
                            </div>
                            <div>
                              <b>Téléphone:</b> {client.telephone}
                            </div>
                            <div>
                              <b>Adresse:</b> {client.adresse}, {client.ville}
                            </div>
                            <div>
                              <b>Facture EDF:</b> {client.montantFactureEDF} €
                            </div>
                            <div>
                              <b>Âge MR:</b> {client.ageMR} | <b>Âge Mme:</b>{' '}
                              {client.ageMME}
                            </div>
                            <div>
                              <b>Profession MR:</b> {client.professionMR} |{' '}
                              <b>Profession Mme:</b> {client.professionMME}
                            </div>
                            <hr style={{ margin: '18px 0' }} />
                            <h4 style={{ marginBottom: 10, color: '#2563eb' }}>
                              Équipements étude perso
                            </h4>
                            {client.etudePerso ? (
                              <ul style={{ paddingLeft: 18 }}>
                                {Object.entries(client.etudePerso).map(
                                  ([key, value]) =>
                                    value && typeof value === 'boolean' ? (
                                      <li key={key}>
                                        {etudePersoElements.find(
                                          (e) => e.key === key
                                        )?.label || key}
                                      </li>
                                    ) : null
                                )}
                                {Object.entries(client.etudePerso).map(
                                  ([key, value]) =>
                                    typeof value === 'number' && value > 0 ? (
                                      <li key={key}>
                                        {etudePersoElements.find(
                                          (e) => e.key === key
                                        )?.label || key}
                                        : {value}
                                      </li>
                                    ) : null
                                )}
                                {client.etudePerso.autres && (
                                  <li>
                                    <b>Autres:</b> {client.etudePerso.autres}
                                  </li>
                                )}
                              </ul>
                            ) : (
                              <div style={{ color: '#64748b' }}>
                                Aucune étude perso renseignée.
                              </div>
                            )}
                            <hr style={{ margin: '18px 0' }} />
                            <h4 style={{ marginBottom: 10, color: '#2563eb' }}>
                              Profil du client (étude perso)
                            </h4>
                            {client.etudePerso &&
                            Array.isArray(client.etudePerso.profilClient) &&
                            client.etudePerso.profilClient.length > 0 ? (
                              <ul style={{ paddingLeft: 18 }}>
                                {client.etudePerso.profilClient.map((key) => (
                                  <li key={key}>
                                    {profilOptions.find(
                                      (opt) => opt.key === key
                                    )?.label || key}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ color: '#64748b' }}>
                                Aucun profil renseigné.
                              </div>
                            )}
                            <hr style={{ margin: '18px 0' }} />
                            <h4 style={{ marginBottom: 10, color: '#2563eb' }}>
                              Étude calculateur
                            </h4>
                            {Array.isArray(client.Etude) &&
                            client.Etude.length > 0 ? (
                              client.Etude.map((etude, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    marginBottom: 12,
                                    padding: 10,
                                    background: '#f8fafc',
                                    borderRadius: 6,
                                  }}
                                >
                                  <div>
                                    <b>Date:</b>{' '}
                                    {new Date(etude.date).toLocaleDateString(
                                      'fr-FR'
                                    )}
                                  </div>
                                  <div>
                                    <b>Production estimée:</b>{' '}
                                    {etude.prodMoyenneKwh} kWh
                                  </div>
                                  <div>
                                    <b>Consommation annuelle:</b> {etude.conso}{' '}
                                    kWh
                                  </div>
                                  <div>
                                    <b>Prime EDF:</b> {etude.prime} €
                                  </div>
                                  <div>
                                    <b>Année de rentabilité:</b>{' '}
                                    {etude.anneeRentable ||
                                      etude.nbAnneesRentable ||
                                      '-'}
                                  </div>
                                  {etude.renta &&
                                    Array.isArray(etude.renta) && (
                                      <div style={{ marginTop: 8 }}>
                                        <b>Tableau de rentabilité:</b>
                                        <table
                                          style={{
                                            width: '100%',
                                            marginTop: 4,
                                            borderCollapse: 'collapse',
                                            fontSize: 14,
                                          }}
                                        >
                                          <thead>
                                            <tr
                                              style={{ background: '#e0e7ff' }}
                                            >
                                              <th
                                                style={{
                                                  padding: 4,
                                                  border: '1px solid #c7d2fe',
                                                }}
                                              >
                                                Année
                                              </th>
                                              <th
                                                style={{
                                                  padding: 4,
                                                  border: '1px solid #c7d2fe',
                                                }}
                                              >
                                                Gain
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {etude.renta.map((row, i) => (
                                              <tr key={i}>
                                                <td
                                                  style={{
                                                    padding: 4,
                                                    border: '1px solid #c7d2fe',
                                                  }}
                                                >
                                                  {row.annee}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: 4,
                                                    border: '1px solid #c7d2fe',
                                                  }}
                                                >
                                                  {row.gain} €
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                </div>
                              ))
                            ) : (
                              <div style={{ color: '#64748b' }}>
                                Aucune étude calculateur renseignée.
                              </div>
                            )}
                            <div style={{ textAlign: 'right', marginTop: 18 }}>
                              <button
                                onClick={() => setShowFicheClientId(null)}
                                style={{
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '10px 22px',
                                  fontWeight: 700,
                                  fontSize: 16,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px #ef444422',
                                }}
                              >
                                Fermer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* MODAL ÉTAT PROJET */}
                    {showEtatProjetId && (
                      <div
                        style={{
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          width: '100vw',
                          height: '100vh',
                          background: 'rgba(0,0,0,0.25)',
                          zIndex: 1000,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div
                          style={{
                            background: '#fff',
                            borderRadius: 12,
                            padding: 32,
                            minWidth: 320,
                            boxShadow: '0 2px 16px #0002',
                            position: 'relative',
                          }}
                        >
                          <h3 style={{ marginBottom: 18, color: '#2563eb' }}>
                            État du projet
                          </h3>
                          {/* Champ date pour RDV pris tout en haut */}
                          <div style={{ marginBottom: 18 }}>
                            <span
                              style={{
                                fontWeight: 500,
                                color: '#64748b',
                                marginRight: 8,
                              }}
                            >
                              Date RDV pris :
                            </span>
                            <input
                              type="date"
                              value={
                                etatProjet[showEtatProjetId]?.rdvPrisDate
                                  ? etatProjet[
                                      showEtatProjetId
                                    ].rdvPrisDate.substring(0, 10)
                                  : ''
                              }
                              onChange={(e) =>
                                handleChangeEtatProjet(
                                  'rdvPrisDate',
                                  e.target.value
                                )
                              }
                              style={{
                                padding: 6,
                                borderRadius: 6,
                                border: '1px solid #d1d5db',
                                fontSize: 15,
                              }}
                            />
                          </div>
                          {/* Liste des statuts */}
                          {[
                            'rdvFait',
                            'attente',
                            'vendu',
                            'nonVendu',
                            'declarationEnCours',
                            'declarationValidee',
                            'installe',
                          ].map((key) => (
                            <div key={key} style={{ marginBottom: 10 }}>
                              <label
                                style={{ fontWeight: 600, marginRight: 12 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    !!etatProjet[showEtatProjetId]?.[key]
                                  }
                                  onChange={(e) =>
                                    handleChangeEtatProjet(
                                      key,
                                      e.target.checked
                                    )
                                  }
                                />
                                {key === 'rdvFait'
                                  ? 'RDV fait'
                                  : key === 'attente'
                                  ? 'En attente'
                                  : key === 'vendu'
                                  ? 'Vendu'
                                  : key === 'nonVendu'
                                  ? 'Non vendu'
                                  : key === 'declarationEnCours'
                                  ? 'Déclaration en cours'
                                  : key === 'declarationValidee'
                                  ? 'Déclaration validée'
                                  : key === 'installe'
                                  ? 'Installé'
                                  : key}
                              </label>
                              {/* Champ date pour RDV fait */}
                              {key === 'rdvFait' &&
                                etatProjet[showEtatProjetId]?.[key] && (
                                  <input
                                    type="date"
                                    value={
                                      etatProjet[showEtatProjetId]?.rdvFaitDate
                                        ? etatProjet[
                                            showEtatProjetId
                                          ].rdvFaitDate.substring(0, 10)
                                        : ''
                                    }
                                    onChange={(e) =>
                                      handleChangeEtatProjet(
                                        'rdvFaitDate',
                                        e.target.value
                                      )
                                    }
                                    style={{
                                      marginLeft: 16,
                                      padding: 6,
                                      borderRadius: 6,
                                      border: '1px solid #d1d5db',
                                      fontSize: 15,
                                    }}
                                  />
                                )}
                            </div>
                          ))}
                          <div
                            style={{ display: 'flex', gap: 16, marginTop: 24 }}
                          >
                            <button
                              onClick={() =>
                                handleSaveEtatProjet(showEtatProjetId)
                              }
                              style={{
                                padding: '10px 24px',
                                background: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 16,
                                cursor: 'pointer',
                              }}
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={() => setShowEtatProjetId(null)}
                              style={{
                                padding: '10px 24px',
                                background: '#e5e7eb',
                                color: '#222',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 16,
                                cursor: 'pointer',
                              }}
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            );
          })}
      </ul>

      {/* MODAL ÉTAT PROJET */}
      {showEtatProjetId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 32,
              minWidth: 320,
              boxShadow: '0 2px 16px #0002',
              position: 'relative',
            }}
          >
            <h3 style={{ marginBottom: 18, color: '#2563eb' }}>
              État du projet
            </h3>
            {/* Champ date pour RDV pris tout en haut */}
            <div style={{ marginBottom: 18 }}>
              <span
                style={{
                  fontWeight: 500,
                  color: '#64748b',
                  marginRight: 8,
                }}
              >
                Date RDV pris :
              </span>
              <input
                type="date"
                value={
                  etatProjet[showEtatProjetId]?.rdvPrisDate
                    ? etatProjet[showEtatProjetId].rdvPrisDate.substring(0, 10)
                    : ''
                }
                onChange={(e) =>
                  handleChangeEtatProjet('rdvPrisDate', e.target.value)
                }
                style={{
                  padding: 6,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 15,
                }}
              />
            </div>
            {/* Liste des statuts */}
            {[
              'rdvFait',
              'attente',
              'vendu',
              'nonVendu',
              'declarationEnCours',
              'declarationValidee',
              'installe',
            ].map((key) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label
                  style={{ fontWeight: 600, marginRight: 12 }}
                >
                  <input
                    type="checkbox"
                    checked={!!etatProjet[showEtatProjetId]?.[key]}
                    onChange={(e) =>
                      handleChangeEtatProjet(key, e.target.checked)
                    }
                  />
                  {key === 'rdvFait'
                    ? 'RDV fait'
                    : key === 'attente'
                    ? 'En attente'
                    : key === 'vendu'
                    ? 'Vendu'
                    : key === 'nonVendu'
                    ? 'Non vendu'
                    : key === 'declarationEnCours'
                    ? 'Déclaration en cours'
                    : key === 'declarationValidee'
                    ? 'Déclaration validée'
                    : key === 'installe'
                    ? 'Installé'
                    : key}
                </label>
                {/* Champ date pour RDV fait */}
                {key === 'rdvFait' && etatProjet[showEtatProjetId]?.[key] && (
                  <input
                    type="date"
                    value={
                      etatProjet[showEtatProjetId]?.rdvFaitDate
                        ? etatProjet[showEtatProjetId].rdvFaitDate.substring(
                            0,
                            10
                          )
                        : ''
                    }
                    onChange={(e) =>
                      handleChangeEtatProjet('rdvFaitDate', e.target.value)
                    }
                    style={{
                      marginLeft: 16,
                      padding: 6,
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      fontSize: 15,
                    }}
                  />
                )}
              </div>
            ))}
            <div
              style={{ display: 'flex', gap: 16, marginTop: 24 }}
            >
              <button
                onClick={() => handleSaveEtatProjet(showEtatProjetId)}
                style={{
                  padding: '10px 24px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Enregistrer
              </button>
              <button
                onClick={() => setShowEtatProjetId(null)}
                style={{
                  padding: '10px 24px',
                  background: '#e5e7eb',
                  color: '#222',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Ajout de la fonction d'upload
async function handleUploadFiles(clientId, files) {
  if (!files || files.length === 0) return;
  const uploadedDocs = {};
  for (const file of files) {
    const storageRef = ref(storage, `clients/${clientId}/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    uploadedDocs[file.name] = url;
  }
  // Met à jour le client dans Firestore
  const clientRef = doc(db, 'clients', clientId);
  await updateDoc(clientRef, {
    docs: uploadedDocs,
  });
  alert('Fichiers importés et enregistrés !');
}
