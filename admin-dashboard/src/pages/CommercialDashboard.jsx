import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import RdvNoteForm from '../components/RdvNoteForm';
import RdvNotesList from '../components/RdvNotesList';
import { auth, db } from '../firebaseConfig';

// Remplace l'ancien composant FloatingButtons par une version plus épurée et professionnelle
function FloatingButtons() {
  const [hovered, setHovered] = React.useState(null);

  const buttonBase = {
    width: 54,
    height: 54,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.92)',
    color: '#1976d2',
    border: '1px solid #e3e6ea',
    boxShadow: '0 2px 12px rgba(25, 118, 210, 0.08)',
    cursor: 'pointer',
    transition: 'box-shadow 0.18s, background 0.18s, color 0.18s, border 0.18s',
    fontSize: 22,
    outline: 'none',
    marginBottom: 10,
  };

  const buttonHover = {
    background: '#1976d2',
    color: '#fff',
    border: '1px solid #1976d2',
    boxShadow: '0 6px 24px rgba(25, 118, 210, 0.16)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: 28,
        top: '42%',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        zIndex: 2000,
        pointerEvents: 'none',
      }}
    >
      <button
        style={{
          ...buttonBase,
          ...(hovered === 'dashboard' ? buttonHover : {}),
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => setHovered('dashboard')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => (window.location.href = '/dashboard')}
        aria-label="Dashboard"
        title="Dashboard"
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4H9v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        </svg>
      </button>
      <button
        style={{
          ...buttonBase,
          ...(hovered === 'plannings' ? buttonHover : {}),
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => setHovered('plannings')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => (window.location.href = '/plannings')}
        aria-label="Plannings"
        title="Plannings"
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M16 3v4M8 3v4M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <button
        style={{
          ...buttonBase,
          ...(hovered === 'etude' ? buttonHover : {}),
          pointerEvents: 'auto',
        }}
        onMouseEnter={() => setHovered('etude')}
        onMouseLeave={() => setHovered(null)}
        onClick={() => (window.location.href = '/etude-perso')}
        aria-label="Etude Perso"
        title="Etude Perso"
      >
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#fff"/>
          <path d="M8 16c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="10" r="2" fill="currentColor"/>
        </svg>
      </button>
    </div>
  );
}

const actionBtnStyle = {
  green: {
    background: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
  },
  red: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
  },
  blue: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
  },
};

function JustificatifsUploader({ client, onClose, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState({});
  const fileInputs = useRef({});
  const storage = getStorage();
  const types = [
    'Facture EDF',
    'PI',
    "Avis d'impots",
    'RIB',
    'Taxe foncière',
    'Justificatif de domicile',
    'Facture',
  ];

  useEffect(() => {
    if (client.justificatifs) setUploaded(client.justificatifs);
  }, [client]);

  const handleFile = async (type, file) => {
    setUploading(true);
    const fileRef = storageRef(storage, `clients/${client.id}/${type}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    const newUploaded = { ...uploaded, [type]: url };
    setUploaded(newUploaded);
    await updateDoc(doc(db, 'clients', client.id), {
      justificatifs: newUploaded,
    });
    setUploading(false);
    if (onUploaded) onUploaded(newUploaded);
  };

  // Drag & drop
  const handleDrop = (type, e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(type, e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(30,41,59,0.25)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
        maxHeight: '100vh',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          padding: 36,
          boxShadow: '0 8px 32px rgba(16,30,54,0.18)',
          minWidth: 380,
          maxWidth: 480,
          width: '100%',
          position: 'relative',
          border: '1.5px solid #e5e7eb',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: 18,
            top: 18,
            background: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            fontSize: 26,
            cursor: 'pointer',
            color: '#2563eb',
            boxShadow: '0 2px 8px #2563eb22',
            transition: 'background 0.2s, color 0.2s',
            zIndex: 2,
          }}
          onMouseOver={e => e.currentTarget.style.background = '#e0e7ff'}
          onMouseOut={e => e.currentTarget.style.background = '#fff'}
          aria-label="Fermer la fiche client"
        >
          ×
        </button>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 28, color: '#2563eb' }}>📎</span>
          <h3
            style={{
              margin: 0,
              fontSize: 22,
              color: '#1e293b',
              fontWeight: 700,
            }}
          >
            Importer des justificatifs
          </h3>
        </div>
        <div style={{ color: '#64748b', fontSize: 15, marginBottom: 18 }}>
          Client : <b>{client.nom}</b>
        </div>
        {types.map((type) => (
          <div key={type} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              {type}
            </div>
            <div
              onDrop={(e) => handleDrop(type, e)}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: '2px dashed #2563eb55',
                borderRadius: 10,
                padding: '18px 12px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 48,
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'border 0.2s',
              }}
              onClick={() => !uploading && fileInputs.current[type]?.click()}
            >
              <input
                type="file"
                accept="application/pdf,image/*"
                ref={(el) => (fileInputs.current[type] = el)}
                style={{ display: 'none' }}
                onChange={(e) =>
                  e.target.files[0] && handleFile(type, e.target.files[0])
                }
                disabled={uploading}
              />
              <span style={{ fontSize: 22, color: '#2563eb' }}>⬆️</span>
              <span style={{ color: '#64748b', fontSize: 15 }}>
                {uploaded[type]
                  ? 'Fichier importé'
                  : 'Glisser-déposer ou cliquer pour importer'}
              </span>
              {uploaded[type] && (
                <a
                  href={uploaded[type]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: 'auto',
                    color: '#2563eb',
                    fontWeight: 600,
                    fontSize: 15,
                    textDecoration: 'underline',
                  }}
                >
                  Voir
                </a>
              )}
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 18,
            color: uploading ? '#f59e0b' : '#10b981',
            fontWeight: 600,
            textAlign: 'center',
            minHeight: 24,
          }}
        >
          {uploading ? 'Envoi en cours...' : ''}
        </div>
      </div>
    </div>
  );
}

export default function CommercialDashboard() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [newClient, setNewClient] = useState({
    civilite: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    ville: '',
    adresse: '',
    codePostal: '',
    ageMr: '',
    ageMme: '',
    professionMr: '',
    professionMme: '',
    prixCentrale: '',
    statut: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [showPerformance, setShowPerformance] = useState(false);
  const [topVendeurs, setTopVendeurs] = useState([]);
  const [allVendeurs, setAllVendeurs] = useState([]);
  const [clientListType, setClientListType] = useState('mesClients');

  const [searchClient, setSearchClient] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'performance', 'statsEquipe', 'statsGlobal'

  // Ajout pour stats équipe
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [selectedTeamMonth, setSelectedTeamMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const statutsPossibles = [
    'Prospect',
    'En cours',
    'RDV programmé',
    'Vendu',
    'Installé',
    'Annulé',
  ];
  const civilites = ['Mr', 'Mme'];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const idToken = await u.getIdTokenResult();
        console.log('Claims récupérés :', idToken.claims);
        if (!idToken.claims.role) {
          console.error('Rôle manquant dans les claims Firebase.');
          alert(
            'Erreur : rôle manquant dans les claims Firebase. Veuillez vérifier la configuration.'
          );
        }
        setUser(u);
        setRole(idToken.claims.role || null);
      } else {
        console.log('Utilisateur non connecté ou claims manquants.');
        setUser(null);
        setRole(null);
        setClients([]);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || (role !== 'commercial' && role !== 'admin'))
      return setClients([]);

    let q;
    if (clientListType === 'mesClients') {
      console.log('Recherche clients pour emailCommercial =', user.email);
      q = query(
        collection(db, 'clients'),
        where('emailCommercial', '==', user.email)
      );
    } else {
      q = query(collection(db, 'clients'));
    }

    return onSnapshot(q, (snap) => {
      const clientsData = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      console.log('Clients Firestore reçus :', clientsData);
      setClients(clientsData);
    });
  }, [user, role, clientListType]);

  useEffect(() => {
    setFilteredClients(
      clients.filter((c) => {
        if (typeof c.statut !== 'string') {
          console.log('[DEBUG statut filtrage]', c.nom, c.statut, typeof c.statut);
        }
        return (
          c.nom?.toLowerCase().includes(searchName.toLowerCase()) &&
          (statutFilter ? c.statut === statutFilter : true)
        );
      })
    );
  }, [clients, searchName, statutFilter]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'statsVendeurs'),
      where('mois', '==', selectedMonth)
    );
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const sorted = [...arr].sort((a, b) => b.totalCA - a.totalCA);
      setAllVendeurs(sorted);
      setTopVendeurs(sorted.slice(0, 5));
    });
    return unsub;
  }, [user, selectedMonth]);

  // Regroupe tous les calculs de stats au même endroit pour éviter les doublons et erreurs de portée
  const clientsVendus = clients.filter((c) =>
    ['Vendu', 'Installé'].includes(c.statut)
  );
  const totalCA = clientsVendus.reduce(
    (acc, c) => acc + Number(c.prixCentrale || 0),
    0
  );
  const totalVentes = clientsVendus.length;
  const salaireFixe = 1500;
  const salaireVariable = totalCA * 0.04;
  const salaryTotal = salaireFixe + salaireVariable;

  // Calculs stats RDV et ventes (centralisé pour éviter les erreurs de portée)
  const rdvAttribues = clients.length;
  const rdvFaits = clients.filter(
    (c) => c.statut && c.statut !== 'Prospect'
  ).length;
  const rdvVendus = clients.filter((c) =>
    ['Vendu', 'Installé'].includes(c.statut)
  ).length;
  const commissions = clients
    .filter((c) => ['Vendu', 'Installé'].includes(c.statut))
    .reduce((acc, c) => acc + Number(c.prixCentrale || 0) * 0.04, 0);
  const salaireTotal = salaireFixe + commissions;

  const monthMap = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(0, i).toLocaleString('fr-FR', { month: 'short' }),
    ventes: 0,
    CA: 0,
  }));

  clientsVendus.forEach((c) => {
    const date = c.createdAt?.toDate?.() || new Date();
    monthMap[date.getMonth()].ventes += 1;
    monthMap[date.getMonth()].CA += Number(c.prixCentrale || 0);
  });

  const handleSave = (id) =>
    editingId ? handleUpdateClient(id) : handleAddClient();

  const handleAddClient = async () => {
    if (!newClient.nom || !newClient.email || !user?.email)
      return alert('Nom et email requis !');
    await addDoc(collection(db, 'clients'), {
      ...newClient,
      prixCentrale: parseFloat(newClient.prixCentrale || '0'),
      emailCommercial: user.email,
      createdAt: Timestamp.now(),
    });
    // On attend que Firestore rafraîchisse la liste, donc on reset l'édition et le formulaire
    setEditingId(null);
    resetForm();
  };

  const handleUpdateClient = async (id) => {
    // Si l'ID est manquant, on le retrouve dans le tableau clients par email
    let clientId = id;
    if (!clientId || typeof clientId !== 'string' || clientId.trim() === '') {
      const found = clients.find(c => c.email === newClient.email);
      if (found && found.id) {
        clientId = found.id;
      } else {
        console.error('[ERREUR] Impossible de retrouver l\'ID client pour update:', newClient.email);
        alert('Erreur : ID client manquant ou invalide. Impossible de mettre à jour.');
        return;
      }
    }
    const safeClient = {};
    Object.keys(newClient).forEach(k => {
      if (k === 'prixCentrale') {
        safeClient[k] = parseFloat(newClient[k] || '0');
      } else {
        safeClient[k] = newClient[k] !== undefined && newClient[k] !== null ? String(newClient[k]) : '';
      }
    });
    console.log('[DEBUG client avant update]', safeClient);
    await updateDoc(doc(db, 'clients', clientId), safeClient);
    resetForm();
    setEditingId(null);
  };

  const handleDeleteClient = async (id) => {
    if (window.confirm('Supprimer ce client ?'))
      await deleteDoc(doc(db, 'clients', id));
  };

  const resetForm = () => {
    setNewClient({
      civilite: '',
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      ville: '',
      adresse: '',
      codePostal: '',
      ageMr: '',
      ageMme: '',
      professionMr: '',
      professionMme: '',
      prixCentrale: '',
      statut: '',
    });
  };

  const handleEditClick = (client) => {
    console.log('[DEBUG handleEditClick] client.id =', client.id, client);
    setEditingId(client.id);
    setNewClient({
      civilite: client.civilite || '',
      nom: client.nom || '',
      prenom: client.prenom || '',
      email: client.email || '',
      telephone: client.telephone || '',
      ville: client.ville || '',
      adresse: client.adresse || '',
      codePostal: client.codePostal || '',
      ageMr: client.ageMr || '',
      ageMme: client.ageMme || '',
      professionMr: client.professionMr || '',
      professionMme: client.professionMme || '',
      prixCentrale: client.prixCentrale || '',
      statut: client.statut || '',
    });
  };

  // Ajoute un log pour vérifier les clients récupérés et leur champ createdAt
  useEffect(() => {
    if (clients.length > 0) {
      console.log(
        'Clients récupérés :',
        clients.map((c) => ({ nom: c.nom, createdAt: c.createdAt }))
      );
    }
  }, [clients]);

  useEffect(() => {
    // Récupère tous les users pour stats équipe
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      const allUsers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(allUsers);
      setManagers(allUsers.filter((u) => u.role === 'manager'));
    };
    fetchUsers();
  }, []);

  const [uploadClient, setUploadClient] = useState(null);
  const [showFiche, setShowFiche] = useState(false);
  const [ficheClient, setFicheClient] = useState(null);
  const [showEtude, setShowEtude] = useState(false);
  const [etudeClient, setEtudeClient] = useState(null);
  const [showRdvNoteForm, setShowRdvNoteForm] = useState(false);

  // Ajout d'une équipe de simulation avec commerciaux et clients fictifs
  const fakeManagers = [
    ...managers,
    {
      id: 'simu',
      nom: 'Équipe Simulation',
      email: 'simulation@demo.com',
    },
  ];

  const fakeUsers = [
    ...users,
    // Commerciaux fictifs pour l'équipe de simulation
    {
      id: 'simu-com-1',
      nom: 'Simu Commercial 1',
      email: 'simu1@demo.com',
      role: 'commercial',
      managerEmail: 'simulation@demo.com',
    },
    {
      id: 'simu-com-2',
      nom: 'Simu Commercial 2',
      email: 'simu2@demo.com',
      role: 'commercial',
      managerEmail: 'simulation@demo.com',
    },
  ];

  const fakeClients = [
    ...clients,
    // Clients fictifs pour Simu Commercial 1
    {
      id: 'simu-client-1',
      nom: 'Prospect A',
      statut: 'Vendu',
      emailCommercial: 'simu1@demo.com',
      professionMr: 'Artisan',
      professionMme: 'Infirmière',
      prixCentrale: 12000,
      createdAt: new Date(),
    },
    {
      id: 'simu-client-2',
      nom: 'Prospect B',
      statut: 'Vendu',
      emailCommercial: 'simu1@demo.com',
      professionMr: 'Retraité',
      prixCentrale: 15000,
      createdAt: new Date(),
    },
    {
      id: 'simu-client-3',
      nom: 'Prospect C',
      statut: 'Installé',
      emailCommercial: 'simu1@demo.com',
      professionMr: 'Artisan',
      prixCentrale: 18000,
      createdAt: new Date(),
    },
    // Clients fictifs pour Simu Commercial 2
    {
      id: 'simu-client-4',
      nom: 'Prospect D',
      statut: 'Vendu',
      emailCommercial: 'simu2@demo.com',
      professionMr: 'Cadre',
      prixCentrale: 20000,
      createdAt: new Date(),
    },
    {
      id: 'simu-client-5',
      nom: 'Prospect E',
      statut: 'Installé',
      emailCommercial: 'simu2@demo.com',
      professionMr: 'Cadre',
      prixCentrale: 21000,
      createdAt: new Date(),
    },
    {
      id: 'simu-client-6',
      nom: 'Prospect F',
      statut: 'Vendu',
      emailCommercial: 'simu2@demo.com',
      professionMr: 'Commerçant',
      prixCentrale: 17000,
      createdAt: new Date(),
    },
  ];

  if (!user) return <p>Veuillez vous connecter pour voir votre dashboard.</p>;
  if (role !== 'commercial' && role !== 'admin' && role !== 'manager')
    return <p>Accès refusé : rôle invalide ou manquant.</p>;

  return (
    <>
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          padding: 0,
          background: 'linear-gradient(120deg, #f8fafc 60%, #e0e7ef 100%)',
          minHeight: '100vh',
          // Assure qu'aucun overflow ou zIndex ne masque les boutons flottants
          overflow: 'visible',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <FloatingButtons />
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 40 }}>
          <h2
            style={{
              fontSize: 32,
              marginBottom: 28,
              color: '#1e293b',
              fontWeight: 800,
              letterSpacing: '-1px',
            }}
          >
            👤 Bienvenue, <span style={{ color: '#2563eb' }}>{user.email}</span>
          </h2>
          <div style={{ marginBottom: 32, display: 'flex', gap: 16 }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                marginRight: 6,
                padding: '10px 22px',
                background: activeTab === 'dashboard' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'dashboard' ? '#fff' : '#334155',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 17,
                boxShadow:
                  activeTab === 'dashboard' ? '0 2px 8px #2563eb22' : 'none',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              style={{
                marginRight: 6,
                padding: '10px 22px',
                background: activeTab === 'performance' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'performance' ? '#fff' : '#334155',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 17,
                boxShadow:
                  activeTab === 'performance' ? '0 2px 8px #2563eb22' : 'none',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              Performance
            </button>
            <button
              onClick={() => setActiveTab('statsEquipe')}
              style={{
                marginRight: 6,
                padding: '10px 22px',
                background: activeTab === 'statsEquipe' ? '#2563eb' : '#f1f5f9',
                color: activeTab === 'statsEquipe' ? '#fff' : '#334155',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 17,
                boxShadow:
                  activeTab === 'statsEquipe' ? '0 2px 8px #2563eb22' : 'none',
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}
            >
              Stats équipe
            </button>
            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('statsGlobal')}
                style={{
                  padding: '10px 22px',
                  background: activeTab === 'statsGlobal' ? '#2563eb' : '#f1f5f9',
                  color: activeTab === 'statsGlobal' ? '#fff' : '#334155',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 17,
                  boxShadow:
                    activeTab === 'statsGlobal' ? '0 2px 8px #2563eb22' : 'none',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
              >
                Stats global
              </button>
            )}
          </div>
          <div
            style={{ borderBottom: '1.5px solid #e5e7eb', marginBottom: 32 }}
          />

          {activeTab === 'dashboard' && (
            <>
              {/* Boutons Mes clients / Clients Botaik juste au-dessus du tableau clients (position unique) */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                  onClick={() => setClientListType('mesClients')}
                  style={{
                    padding: '8px 16px',
                    background:
                      clientListType === 'mesClients' ? '#3b82f6' : '#e5e7eb',
                    color: clientListType === 'mesClients' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  Mes clients
                </button>
                <button
                  onClick={() => setClientListType('botaikClients')}
                  style={{
                    padding: '8px 16px',
                    background:
                      clientListType === 'botaikClients' ? '#3b82f6' : '#e5e7eb',
                    color: clientListType === 'botaikClients' ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: 4,
                  }}
                >
                  Clients Botaik
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 20,
                  marginBottom: 40,
                }}
              >
                {[
                  {
                    title: 'Clients Attribués',
                    value: clients.length,
                    color: '#3b82f6',
                  },
                  {
                    title: 'Ventes Réalisées',
                    value: totalVentes,
                    color: '#10b981',
                  },
                  {
                    title: 'CA Validé (€)',
                    value: totalCA.toFixed(2),
                    color: '#f59e0b',
                  },
                  {
                    title: 'Salaire Fixe (€)',
                    value: salaireFixe.toFixed(2),
                    color: '#6366f1',
                  },
                  {
                    title: 'Prime 4% CA (€)',
                    value: salaireVariable.toFixed(2),
                    color: '#8b5cf6',
                  },
                  {
                    title: 'Salaire Total (€)',
                    value: salaryTotal.toFixed(2),
                    color: '#ef4444',
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      flex: '1 1 200px',
                      background: '#fff',
                      borderRadius: 12,
                      padding: 20,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      borderLeft: `6px solid ${s.color}`,
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                      {s.title}
                    </p>
                    <h3 style={{ margin: 0, fontSize: 28, color: s.color }}>
                      {s.value}
                    </h3>
                  </div>
                ))}
              </div>

              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  marginBottom: 40,
                }}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={monthMap}
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    style={{ background: '#f8fafc', borderRadius: 12 }}
                  >
                    {/* Suppression de la grille pointillée */}
                    {/* <CartesianGrid strokeDasharray="3 3" /> */}
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 15, fill: '#64748b' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 15, fill: '#64748b' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                        color: '#0f172a',
                      }}
                      formatter={v => (typeof v === 'number' ? v.toLocaleString('fr-FR') : v)}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 15, color: '#334155' }}
                    />
                    <Bar
                      dataKey="CA"
                      fill="#2563eb"
                      radius={[8, 8, 0, 0]}
                      barSize={28}
                    >
                      <LabelList
                        dataKey="CA"
                        position="top"
                      />
                    </Bar>
                    <Bar
                      dataKey="ventes"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                      barSize={18}
                    >
                      <LabelList
                        dataKey="ventes"
                        position="top"
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {clientListType === 'mesClients' && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: '12px', maxWidth: 700 }}>
                    <input
                      placeholder="🔍 Rechercher par nom"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      style={{
                        gridColumn: '1 / 3',
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    />
                    <select
                      value={statutFilter}
                      onChange={(e) => setStatutFilter(e.target.value)}
                      style={{
                        gridColumn: '1 / 3',
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    >
                      <option value="">Filtrer statut</option>
                      {statutsPossibles.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {/* Champs classiques */}
                    {[
                      'nom',
                      'prenom',
                      'email',
                      'telephone',
                      'ville',
                      'adresse',
                      'codePostal',
                      'prixCentrale',
                    ].map((field, idx) => (
                      <input
                        key={field}
                        placeholder={field}
                        value={newClient[field] || ''}
                        onChange={(e) =>
                          setNewClient({
                            ...newClient,
                            [field]: e.target.value,
                          })
                        }
                        style={{
                          padding: 8,
                          borderRadius: 4,
                          border: '1px solid #ddd',
                        }}
                      />
                    ))}
                    {/* Champs spécifiques Mr/Mme */}
                    <input
                      placeholder="Profession Mr"
                      value={newClient.professionMr || ''}
                      onChange={(e) =>
                        setNewClient({ ...newClient, professionMr: e.target.value })
                      }
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    />
                    <input
                      placeholder="Profession Mme"
                      value={newClient.professionMme || ''}
                      onChange={(e) =>
                        setNewClient({ ...newClient, professionMme: e.target.value })
                      }
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    />
                    <input
                      placeholder="Age Mr"
                      value={newClient.ageMr || ''}
                      onChange={(e) =>
                        setNewClient({ ...newClient, ageMr: e.target.value })
                      }
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    />
                    <input
                      placeholder="Age Mme"
                      value={newClient.ageMme || ''}
                      onChange={(e) =>
                        setNewClient({ ...newClient, ageMme: e.target.value })
                      }
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    />
                    {/* Statut */}
                    <select
                      value={newClient.statut}
                      onChange={(e) =>
                        setNewClient({ ...newClient, statut: e.target.value })
                      }
                      style={{
                        padding: 8,
                        borderRadius: 4,
                        border: '1px solid #ddd',
                      }}
                    >
                      <option value="">Statut</option>
                      {statutsPossibles.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSave()}
                      style={{
                        gridColumn: '1 / 3',
                        padding: '8px 16px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                      }}
                    >
                      {editingId ? '💾 Sauver' : '➕ Ajouter'}
                    </button>
                  </div>
                </div>
              )}

              {/* Barre de recherche et filtre par mois */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                <input
                  type="text"
                  placeholder="Rechercher un client par nom..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  style={{
                    padding: 8,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                    minWidth: 200,
                  }}
                />
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  style={{
                    padding: 8,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                  }}
                >
                  <option value="">Tous les mois</option>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const month = d.toISOString().slice(0, 7);
                    return (
                      <option key={month} value={month}>
                        {d.toLocaleDateString('fr-FR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div
                style={{
                  overflowX: 'auto',
                  background: '#fff',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: '0 8px',
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        'Civilité',
                        'Nom',
                        'Prénom',
                        'Email',
                        'Téléphone',
                        'Ville',
                        'Adresse',
                        'Code Postal',
                        'Profession Mr',
                        'Profession Mme',
                        'Age Mr',
                        'Age Mme',
                        'Prix Centrale (€)',
                        'Statut',
                        'DP à validé', // Ajout colonne
                        'Actions',
                      ].map((th) => (
                        <th
                          key={th}
                          style={{
                            textAlign: 'left',
                            padding: '12px',
                            background: '#f3f4f6',
                            borderRadius: 4,
                          }}
                        >
                          {th}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((c) => (
                      <tr
                        key={c.id}
                        style={{
                          background: '#fff',
                          borderRadius: 4,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          margin: '8px 0',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          // N'ouvre pas la fiche si clic sur un bouton ou input
                          if (["BUTTON", "SELECT", "INPUT"].includes(e.target.tagName)) return;
                          setFicheClient(c);
                          setShowFiche(true);
                        }}
                      >
                        <td style={{ padding: '12px' }}>{c.civilite}</td>
                        <td style={{ padding: '12px' }}>{c.nom}</td>
                        <td style={{ padding: '12px' }}>{c.prenom}</td>
                        <td style={{ padding: '12px' }}>{c.email}</td>
                        <td style={{ padding: '12px' }}>{c.telephone}</td>
                        <td style={{ padding: '12px' }}>{c.ville}</td>
                        <td style={{ padding: '12px' }}>{c.adresse}</td>
                        <td style={{ padding: '12px' }}>{c.codePostal}</td>
                        <td style={{ padding: '12px' }}>{c.professionMr}</td>
                        <td style={{ padding: '12px' }}>{c.professionMme}</td>
                        <td style={{ padding: '12px' }}>{c.ageMr}</td>
                        <td style={{ padding: '12px' }}>{c.ageMme}</td>
                        <td style={{ padding: '12px' }}>{c.prixCentrale}</td>
                        <td style={{ padding: '12px' }}>{c.statut}</td>
                        <td style={{ padding: '12px' }}>
                          <input
                            type="checkbox"
                            checked={!!c.dpAValider}
                            disabled={role !== 'admin'}
                            onChange={async (e) => {
                              if (role !== 'admin') return;
                              await updateDoc(doc(db, 'clients', c.id), {
                                dpAValider: e.target.checked,
                              });
                            }}
                            style={{
                              width: 20,
                              height: 20,
                              cursor:
                                role === 'admin' ? 'pointer' : 'not-allowed',
                            }}
                          />
                        </td>
                        <td style={{ padding: '12px' }}>
                          {clientListType === 'mesClients' ? (
                            editingId === c.id ? (
                              <div key="editing-buttons">
                                {c.id && typeof c.id === 'string' && c.id.trim() !== '' && (
                                  <button
                                    onClick={() => handleUpdateClient(c.id)}
                                    style={actionBtnStyle.green}
                                  >
                                    💾 Sauver
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    resetForm();
                                  }}
                                  style={actionBtnStyle.red}
                                >
                                  ✖️ Annuler
                                </button>
                              </div>
                            ) : (
                              <div key="default-buttons">
                                <button
                                  onClick={() => handleEditClick(c)}
                                  style={actionBtnStyle.blue}
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={() => handleDeleteClient(c.id)}
                                  style={actionBtnStyle.red}
                                >
                                  🗑️ Supprimer
                                </button>
                              </div>
                            )
                          ) : (
                            <span
                              style={{ color: '#6b7280', fontStyle: 'italic' }}
                            >
                              Lecture seule
                            </span>
                          )}
                          <button
                            onClick={() => setUploadClient(c)}
                            style={{ ...actionBtnStyle.blue, marginLeft: 6 }}
                          >
                            📎 Importer des documents
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {activeTab === 'performance' && (
            <>
              {/* Sélecteur de mois pour la performance */}
              <div style={{ marginBottom: 20 }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    padding: 8,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                    minWidth: 200,
                  }}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const month = d.toISOString().slice(0, 7);
                    return (
                      <option key={month} value={month}>
                        {d.toLocaleDateString('fr-FR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </option>
                    );
                  })}
                </select>
              </div>
              <h3 style={{ fontSize: 22, marginBottom: 20, color: '#111827' }}>
                🏆 Classement des commerciaux ({selectedMonth})
              </h3>

              {topVendeurs.length === 0 ? (
                <p style={{ color: '#6b7280' }}>
                  Aucune donnée disponible pour ce mois.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      gap: 30,
                      flexWrap: 'wrap',
                      marginBottom: 40,
                    }}
                  >
                    {topVendeurs.map((v, index) => {
                      const podiumColors = [
                        '#FFD700',
                        '#C0C0C0',
                        '#CD7F32',
                        '#94a3b8',
                        '#e5e7eb',
                      ];
                      const podiumHeights = [160, 140, 120, 100, 90];
                      const place = index + 1;
                      const isUser = user?.email === v.email;
                      const badges = ['🥇', '🥈', '🥉', '🎖️', '🏅'];

                      return (
                        <motion.div
                          key={v.email}
                          initial={{ y: 50, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1 * index }}
                          style={{ textAlign: 'center', minWidth: 100 }}
                        >
                          <div
                            style={{
                              background: podiumColors[index],
                              height: podiumHeights[index],
                              width: 100,
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: 22,
                              color: '#111827',
                              marginBottom: 8,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              border: isUser ? '3px solid #10b981' : 'none',
                            }}
                          >
                            {badges[index]} {place}ᵉ
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>
                            {v.nom || v.email.split('@')[0]}
                            {isUser && ' ⭐'}
                          </div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 'bold',
                              color: '#10b981',
                              marginTop: 4,
                            }}
                          >
                            {v.totalCA?.toLocaleString('fr-FR')} €
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            {v.nbVentes} ventes
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      background: '#fff',
                      padding: 20,
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      marginBottom: 40,
                    }}
                  >
                    <h4 style={{ marginBottom: 16 }}>
                      📊 Classement Top 10 (CA en €)
                    </h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={allVendeurs.slice(0, 10)}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          tickFormatter={(val) =>
                            `${val.toLocaleString('fr-FR')} €`
                          }
                        />
                        <YAxis
                          dataKey="nom"
                          type="category"
                          tick={{ fontSize: 14 }}
                        />
                        <Tooltip
                          formatter={(value) =>
                            `${value.toLocaleString('fr-FR')} €`
                          }
                        />
                        <Legend />
                        <Bar
                          dataKey="totalCA"
                          fill="#3b82f6"
                          isAnimationActive={true}
                        >
                          <LabelList
                            dataKey="totalCA"
                            position="right"
                            formatter={(v) =>
                              typeof v === 'number'
                                ? `${v.toLocaleString('fr-FR')} €`
                                : v
                            }
                            style={{ fontSize: 14, fill: '#000' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}
          {activeTab === 'statsEquipe' && (
            <div>
              <h3>Stats équipe</h3>
              {/* Sélecteur de mois pour stats équipe */}
              <div style={{ marginBottom: 20 }}>
                <select
                  value={selectedTeamMonth}
                  onChange={(e) => setSelectedTeamMonth(e.target.value)}
                  style={{
                    padding: 8,
                    borderRadius: 4,
                    border: '1px solid #ccc',
                    minWidth: 200,
                  }}
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const month = d.toISOString().slice(0, 7);
                    return (
                      <option key={month} value={month}>
                        {d.toLocaleDateString('fr-FR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {fakeManagers.map((manager) => {
                  // Trouve les commerciaux de l'équipe
                  const team = users.filter(
                    (u) =>
                      u.role === 'commercial' && u.managerEmail === manager.email
                  );
                  // Trouve les clients de l'équipe (tous les clients attribués à un commercial de cette équipe)
                  const teamClientEmails = team.map((c) => c.email);
                  // Filtre les clients de l'équipe pour le mois sélectionné
                  const teamClients = clients.filter(
                    (c) =>
                      teamClientEmails.includes(c.emailCommercial) &&
                      c.createdAt &&
                      (c.createdAt.toDate?.() || c.createdAt)
                        .toISOString()
                        .slice(0, 7) === selectedTeamMonth
                  );
                  const caEquipe = teamClients.reduce(
                    (acc, c) => acc + Number(c.prixCentrale || 0),
                    0
                  );
                  const ventesEquipe = teamClients.filter((c) =>
                    ['Vendu', 'Installé'].includes(c.statut)
                  ).length;
                  return (
                    <div
                      key={manager.id}
                      style={{
                        background: '#fff',
                        borderRadius: 16,
                        padding: 28,
                        boxShadow: '0 6px 24px rgba(16,30,54,0.08)',
                        cursor: 'pointer',
                        minWidth: 260,
                        minHeight: 140,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        transition: 'box-shadow 0.2s, transform 0.2s',
                        border: '1.5px solid #e5e7eb',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                      onClick={() => setSelectedManager(manager)}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.boxShadow =
                          '0 12px 32px rgba(16,30,54,0.13)')
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.boxShadow =
                          '0 6px 24px rgba(16,30,54,0.08)')
                      }
                    >
                      {/* Avatar/icône équipe */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          background: '#2563eb22',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 26,
                          color: '#2563eb',
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        <span role="img" aria-label="manager">
                          👥
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 18,
                          color: '#1e293b',
                          marginBottom: 2,
                        }}
                      >
                        {manager.nom || manager.email.split('@')[0]}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: '#64748b',
                          marginBottom: 10,
                        }}
                      >
                        {manager.email}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 18,
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <div
                          style={{
                            color: '#2563eb',
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: '-1px',
                          }}
                        >
                          {caEquipe.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </div>
                        <div
                          style={{
                            color: '#10b981',
                            fontSize: 16,
                            fontWeight: 600,
                            background: '#e0f7ef',
                            borderRadius: 8,
                            padding: '2px 10px',
                            marginLeft: 6,
                          }}
                        >
                          Ventes : {ventesEquipe}
                        </div>
                      </div>
                      <div
                        style={{
                          position: 'absolute',
                          right: 18,
                          top: 18,
                          color: '#cbd5e1',
                          fontSize: 18,
                          fontWeight: 600,
                        }}
                      >
                        Équipe
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectedManager && (
                <div
                  style={{
                    marginTop: 36,
                    background: '#fff',
                    borderRadius: 16,
                    padding: 32,
                    boxShadow: '0 8px 32px rgba(16,30,54,0.13)',
                    maxWidth: 700,
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => setSelectedManager(null)}
                    style={{
                      position: 'absolute',
                      right: 24,
                      top: 24,
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
                  <h4
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: '#2563eb',
                      marginBottom: 24,
                      letterSpacing: '-1px',
                    }}
                  >
                    Équipe de {selectedManager.nom || selectedManager.email}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 24,
                      justifyContent: 'flex-start',
                    }}
                  >
                    {fakeUsers
                      .filter(
                        (u) =>
                          u.role === 'commercial' &&
                          u.managerEmail === selectedManager.email
                      )
                      .map((com) => {
                        const comClients = fakeClients.filter(
                          (c) =>
                            c.emailCommercial === com.email &&
                            c.createdAt &&
                            (c.createdAt.toDate?.() || c.createdAt)
                              .toISOString()
                              .slice(0, 7) === selectedTeamMonth
                        );
                        const caCom = comClients.reduce(
                          (acc, c) => acc + Number(c.prixCentrale || 0),
                          0
                        );
                        const ventesCom = comClients.filter((c) =>
                          ['Vendu', 'Installé'].includes(c.statut)
                        ).length;
                        // --- TOP 3 PROFESSIONS ---
                        const clientsVendus = comClients.filter((c) => ['Vendu', 'Installé'].includes(c.statut));
                        const profCount = {};
                        clientsVendus.forEach((c) => {
                          if (c.professionMr) profCount[c.professionMr] = (profCount[c.professionMr] || 0) + 1;
                          if (c.professionMme) profCount[c.professionMme] = (profCount[c.professionMme] || 0) + 1;
                        });
                        const topProf = Object.entries(profCount)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3);
                        return (
                          <div
                            key={com.id}
                            style={{
                              background: '#f8fafc',
                              borderRadius: 14,
                              boxShadow: '0 2px 12px #2563eb11',
                              padding: 24,
                              minWidth: 220,
                              flex: '1 1 220px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              position: 'relative',
                              border: '1.5px solid #e5e7eb',
                              transition: 'box-shadow 0.18s',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 10,
                              }}
                            >
                              <span style={{ fontSize: 22, color: '#2563eb' }}>👤</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 17,
                                  color: '#1e293b',
                                }}
                              >
                                {com.nom || com.email}
                              </span>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 8,
                              }}
                            >
                              <span
                                style={{
                                  color: '#10b981',
                                  fontWeight: 700,
                                  fontSize: 18,
                                }}
                              >
                                {caCom.toLocaleString('fr-FR', {
                                  style: 'currency',
                                  currency: 'EUR',
                                })}
                              </span>
                              <span
                                style={{
                                  background: '#e0f7ef',
                                  color: '#10b981',
                                  borderRadius: 8,
                                  padding: '2px 10px',
                                  fontWeight: 600,
                                  fontSize: 15,
                                  marginLeft: 4,
                                }}
                              >
                                {ventesCom} vente{ventesCom > 1 ? 's' : ''}
                              </span>
                            </div>
                            {/* Affichage du top 3 des professions */}
                            <div style={{ marginTop: 10, width: '100%' }}>
                              <div style={{ fontWeight: 600, color: '#64748b', fontSize: 15, marginBottom: 4 }}>
                                Top 3 professions clients vendus/inst. :
                              </div>
                              {topProf.length === 0 ? (
                                <div style={{ color: '#cbd5e1', fontSize: 14 }}>Aucune donnée</div>
                              ) : (
                                <ol style={{ margin: 0, paddingLeft: 18 }}>
                                  {topProf.map(([prof, count], idx) => (
                                    <li key={prof} style={{ color: '#334155', fontSize: 15 }}>
                                      {prof} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({count})</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                            <div
                              style={{
                                position: 'absolute',
                                right: 18,
                                top: 18,
                                color: '#cbd5e1',
                                fontSize: 18,
                                fontWeight: 600,
                              }}
                            >
                              Commercial
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  {/* Graphique CA/mois équipe (filtré sur le mois sélectionné) */}
                  <div style={{ marginTop: 32 }}>
                    {(() => {
                      // Récupère tous les clients de l'équipe
                      const team = users.filter(
                        (u) =>
                          u.role === 'commercial' &&
                          u.managerEmail === selectedManager.email
                      );
                      const teamClientEmails = team.map((c) => c.email);
                      const teamClients = clients.filter((c) =>
                        teamClientEmails.includes(c.emailCommercial)
                      );
                      // Filtre les clients de l'équipe pour le mois sélectionné
                      const filteredTeamClients = teamClients.filter(
                        (c) =>
                          c.createdAt &&
                          (c.createdAt.toDate?.() || c.createdAt)
                            .toISOString()
                            .slice(0, 7) === selectedTeamMonth
                      );
                      // Prépare les données mensuelles (ici, un seul mois affiché)
                      const d = new Date(selectedTeamMonth + '-01');
                      const months = [
                        {
                          key: selectedTeamMonth,
                          label: d.toLocaleDateString('fr-FR', {
                            month: 'long',
                            year: 'numeric',
                          }),
                          CA: filteredTeamClients.reduce(
                            (acc, c) => acc + Number(c.prixCentrale || 0),
                            0
                          ),
                          ventes: filteredTeamClients.filter((c) =>
                            ['Vendu', 'Installé'].includes(c.statut)
                          ).length,
                        },
                      ];
                      return (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart
                            data={months}
                            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                            style={{ background: '#f8fafc', borderRadius: 12 }}
                          >
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 15, fill: '#64748b' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 15, fill: '#64748b' }}
                              axisLine={{ stroke: '#e5e7eb' }}
                              tickLine={false}
                            />
                            <Tooltip
                              contentStyle={{
                                background: '#fff',
                                borderRadius: 8,
                                border: '1px solid #e5e7eb',
                                color: '#0f172a',
                              }}
                              formatter={(v) =>
                                typeof v === 'number'
                                  ? v.toLocaleString('fr-FR')
                                  : v
                              }
                            />
                            <Legend
                              iconType="circle"
                              wrapperStyle={{ fontSize: 15, color: '#334155' }}
                            />
                            <Bar
                              dataKey="CA"
                              fill="#2563eb"
                              radius={[8, 8, 0, 0]}
                              barSize={28}
                            >
                              <LabelList
                                dataKey="CA"
                                position="top"
                              />
                            </Bar>
                            <Bar
                              dataKey="ventes"
                              fill="#10b981"
                              radius={[8, 8, 0, 0]}
                              barSize={18}
                            >
                              <LabelList
                                dataKey="ventes"
                                position="top"
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'statsGlobal' && role === 'admin' && (
            <div>
              <h3 style={{ fontSize: 22, marginBottom: 20, color: '#111827' }}>
                Stats globales
              </h3>
              <>{(() => {
                // Récupère le mois courant (YYYY-MM)
                const now = new Date();
                const currentMonth = now.toISOString().slice(0, 7);
                // Filtre les clients vendus/validés ce mois-ci
                const clientsVendusMois = clients.filter(
                  (c) =>
                    ['Vendu', 'Installé'].includes(c.statut) &&
                    c.createdAt &&
                    (c.createdAt.toDate?.() || c.createdAt)
                      .toISOString()
                      .slice(0, 7) === currentMonth
                );
                const caMois = clientsVendusMois.reduce(
                  (acc, c) => acc + Number(c.prixCentrale || 0),
                  0
                );
                const ventesMois = clientsVendusMois.length;
                // Prépare les données mensuelles globales
                const months = Array.from({ length: 12 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - (11 - i));
                  return {
                    key: d.toISOString().slice(0, 7),
                    label: d.toLocaleDateString('fr-FR', {
                      month: 'short',
                      year: '2-digit',
                    }),
                    CA: 0,
                    ventes: 0,
                  };
                });
                clients
                  .filter((c) => ['Vendu', 'Installé'].includes(c.statut))
                  .forEach((c) => {
                    const date =
                      c.createdAt?.toDate?.() ||
                      (c.createdAt instanceof Date ? c.createdAt : null);
                    if (!date) return;
                    const key = date.toISOString().slice(0, 7);
                    const idx = months.findIndex((m) => m.key === key);
                    if (idx !== -1) {
                      months[idx].CA += Number(c.prixCentrale || 0);
                      months[idx].ventes += 1;
                    }
                  });
                // Classement commerciaux du mois
                const vendeursMois = {};
                clientsVendusMois.forEach((c) => {
                  if (!vendeursMois[c.emailCommercial])
                    vendeursMois[c.emailCommercial] = { ca: 0, ventes: 0 };
                  vendeursMois[c.emailCommercial].ca += Number(
                    c.prixCentrale || 0
                  );
                  vendeursMois[c.emailCommercial].ventes += 1;
                });
                const classement = Object.entries(vendeursMois)
                  .map(([email, stats]) => ({ email, ...stats }))
                  .sort((a, b) => b.ca - a.ca);
                return (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        gap: 30,
                        marginBottom: 30,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div
                        style={{
                          background: '#fff',
                          borderRadius: 12,
                          padding: 20,
                          minWidth: 220,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          borderLeft: '6px solid #3b82f6',
                        }}
                      >
                        <div style={{ color: '#6b7280', fontSize: 14 }}>
                          CA total du mois
                        </div>
                        <div
                          style={{
                            color: '#3b82f6',
                            fontSize: 28,
                            fontWeight: 700,
                          }}
                        >
                          {caMois.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                          })}
                        </div>
                      </div>
                      <div
                        style={{
                          background: '#fff',
                          borderRadius: 12,
                          padding: 20,
                          minWidth: 220,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                          borderLeft: '6px solid #10b981',
                        }}
                      >
                        <div style={{ color: '#6b7280', fontSize: 14 }}>
                          Ventes du mois
                        </div>
                        <div
                          style={{
                            color: '#10b981',
                            fontSize: 28,
                            fontWeight: 700,
                          }}
                        >
                          {ventesMois}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: 20,
                        marginBottom: 30,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h4 style={{ marginBottom: 16 }}>
                        📊 CA global/mois (12 derniers mois)
                      </h4>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={months}
                          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                          style={{ background: '#f8fafc', borderRadius: 12 }}
                        >
                          {/* Suppression de la grille pointillée, ajout d'une grille discrète ou rien */}
                          {/* <CartesianGrid strokeDasharray="3 3" /> */}
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 15, fill: '#64748b' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 15, fill: '#64748b' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: '#fff',
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                              color: '#0f172a',
                            }}
                            formatter={(v) =>
                              typeof v === 'number'
                                ? v.toLocaleString('fr-FR')
                                : v
                            }
                          />
                          <Legend
                            iconType="circle"
                            wrapperStyle={{ fontSize: 15, color: '#334155' }}
                          />
                          <Bar
                            dataKey="CA"
                            fill="#2563eb"
                            radius={[8, 8, 0, 0]}
                            barSize={28}
                          >
                            <LabelList
                              dataKey="CA"
                              position="top"
                            />
                          </Bar>
                          <Bar
                            dataKey="ventes"
                            fill="#10b981"
                            radius={[8, 8, 0, 0]}
                            barSize={18}
                          >
                            <LabelList
                              dataKey="ventes"
                              position="top"
                              style={{ fontSize: 13, fill: '#0f172a' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: 20,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      }}
                    >
                      <h4 style={{ marginBottom: 16 }}>
                        🏆 Classement commerciaux du mois
                      </h4>
                      {classement.length === 0 ? (
                        <p style={{ color: '#6b7280' }}>
                          Aucune vente ce mois-ci.
                        </p>
                      ) : (
                        <ol style={{ paddingLeft: 20 }}>
                          {classement.map((v, i) => (
                            <li key={v.email} style={{ marginBottom: 8 }}>
                              <strong>{v.email}</strong> — CA :{' '}
                              {v.ca.toLocaleString('fr-FR', {
                                style: 'currency',
                                currency: 'EUR',
                              })}{' '}
                              — Ventes : {v.ventes}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </>
                );
              })()}</>
            </div>
          )}
          {/* Affichage du modal d’upload si uploadClient est défini */}
          {uploadClient && (
            <JustificatifsUploader
              client={uploadClient}
              onClose={() => setUploadClient(null)}
              onUploaded={() => {}}
            />
          )}
          {/* Modal fiche client complète */}
          {showFiche && ficheClient && (
            <>
              <div
                style={{
                  background: '#00000066',
                  position: 'fixed',
                  inset: 0,
                  zIndex: 1000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setShowFiche(false)}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 18,
                    minWidth: 340,
                    maxWidth: 600,
                    width: '100%',
                    boxShadow: '0 8px 32px #2563eb22',
                    position: 'relative',
                    overflow: 'hidden',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* ...header fiche client... */}
                  <button
                    onClick={() => setShowFiche(false)}
                    aria-label="Fermer la fiche client"
                    style={{
                      position: 'absolute',
                      right: 18,
                      top: 18,
                      background: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      fontSize: 26,
                      cursor: 'pointer',
                      color: '#2563eb',
                      boxShadow: '0 2px 8px #2563eb22',
                      transition: 'background 0.2s, color 0.2s',
                      zIndex: 2,
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#e0e7ff'}
                    onMouseOut={e => e.currentTarget.style.background = '#fff'}
                  >
                    ×
                  </button>
                  <div style={{overflowY: 'auto', flex: 1}}>
                    <div style={{background: 'linear-gradient(90deg,#2563eb 0%,#22d3ee 100%)', padding: 28, color: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18}}>
                      <h2 style={{margin: 0, fontWeight: 700, fontSize: 26, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 10}}>
                        <span style={{fontSize: 30}}>👤</span> {ficheClient.nom} {ficheClient.prenom}
                      </h2>
                      <div style={{marginTop: 8, fontSize: 15, opacity: 0.95}}>{ficheClient.email} · {ficheClient.telephone}</div>
                      <div style={{marginTop: 2, fontSize: 15, opacity: 0.95}}>{ficheClient.adresse}, {ficheClient.codePostal} {ficheClient.ville}</div>
                    </div>
                    <div style={{padding: 28, background: '#f8fafc'}}>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18}}>
                        <div style={{flex: '1 1 180px', background: '#fff', borderRadius: 12, padding: 18, minWidth: 160, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>
                            Statut
                          </div>
                          <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.statut}</div>
                        </div>
                        <div style={{flex: '1 1 180px', background: '#fff', borderRadius: 12, padding: 18, minWidth: 160, boxShadow: '0 2px 8px #2563eb11'}}>
                                                   <div style={{fontSize: 13, color: '#888'}}>
                            Commercial

                          </div>
                          <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.commercial || '-'}</div>
                        </div>
                        <div style={{flex: '1 1 180px', background: '#fff', borderRadius: 12, padding: 18, minWidth: 160, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>
                            Montant EDF
                          </div>
                          <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.montant || '-'} €</div>
                        </div>
                        <div style={{flex: '1 1 180px', background: '#fff', borderRadius: 12, padding: 18, minWidth: 160, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>
                            Prix Centrale
                          </div>
                          <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.prixCentrale || '-'} €</div>
                        </div>
                      </div>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18}}>
                        <div style={{flex: '1 1 120px', background: '#fff', borderRadius: 12, padding: 14, minWidth: 120, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>Profession Mr</div>
                          <div style={{fontWeight: 600, fontSize: 15}}>{ficheClient.professionMr || '-'}</div>
                        </div>
                        <div style={{flex: '1 1 120px', background: '#fff', borderRadius: 12, padding: 14, minWidth: 120, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>Profession Mme</div>
                          <div style={{fontWeight: 600, fontSize: 15}}>{ficheClient.professionMme || '-'}</div>
                        </div>
                        <div style={{flex: '1 1 80px', background: '#fff', borderRadius: 12, padding: 14, minWidth: 80, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>Âge Mr</div>
                          <div style={{fontWeight: 600, fontSize: 15}}>{ficheClient.ageMr || '-'}</div>
                        </div>
                        <div style={{flex: '1 1 80px', background: '#fff', borderRadius: 12, padding: 14, minWidth: 80, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888'}}>Âge Mme</div>
                          <div style={{fontWeight: 600, fontSize: 15}}>{ficheClient.ageMme || '-'}</div>
                        </div>
                      </div>
                      <div style={{borderTop: '1px solid #e5e7eb', margin: '18px 0 18px 0'}} />
                      <h4 style={{marginBottom: 16, color: '#2563eb', fontWeight: 700, fontSize: 19, display: 'flex', alignItems: 'center', gap: 8}}><span style={{fontSize: 22}}>☀️</span> Étude du calculateur</h4>
                      {ficheClient.etudeCalculateur ? (
                        <div style={{marginBottom: 18, background: '#fff', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px #2563eb11'}}>
                          <div style={{fontSize: 13, color: '#888', marginBottom: 6}}>Date : {ficheClient.etudeCalculateur.date ? new Date(ficheClient.etudeCalculateur.date).toLocaleString('fr-FR') : '-'}</div>
                          <div style={{display: 'flex', flexWrap: 'wrap', gap: 18}}>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Kit</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.kit || '-'}</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Production annuelle</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.prodMoyenneKwh || '-'} kWh</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Consommation annuelle</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.conso || '-'} kWh</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Inclinaison</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.inclinaison || '-'}°</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Orientation</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.orientation || '-'}</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Adresse</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.adresse || '-'}</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Prime EDF</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.prime || '-'} €</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Revente estimée/an</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.gainRevente || '-'} €</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Économies/an</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.eco || '-'} €</div>
                            </div>
                            <div style={{flex: '1 1 180px'}}>
                              <div style={{fontSize: 13, color: '#888'}}>Années rentabilité</div>
                              <div style={{fontWeight: 700, fontSize: 17}}>{ficheClient.etudeCalculateur.nbAnneesRentable || '-'}</div>
                            </div>
                          </div>
                          {/* Tableau de rentabilité résumé (optionnel) */}
                          {Array.isArray(ficheClient.etudeCalculateur.rentabilite) && ficheClient.etudeCalculateur.rentabilite.length > 0 && (
                            <div style={{marginTop: 12}}>
                              <table style={{width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: 8, overflow: 'hidden', fontSize: 13}}>
                                <thead>
                                  <tr style={{background: '#e0e7ff'}}>
                                    <th style={{padding: 4}}>Année</th>
                                    <th style={{padding: 4}}>Coût EDF</th>
                                    <th style={{padding: 4}}>Coût centrale</th>
                                    <th style={{padding: 4}}>Revente</th>
                                    <th style={{padding: 4}}>Différence</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ficheClient.etudeCalculateur.rentabilite.slice(0, 5).map((row, i) => (
                                    <tr key={i}>
                                      <td style={{padding: 4}}>{row.annee}</td>
                                      <td style={{padding: 4}}>{row.coutEdf} €</td>
                                      <td style={{padding: 4}}>{row.coutCentrale} €</td>
                                      <td style={{padding: 4}}>{row.reventeEstimee} €</td>
                                      <td style={{padding: 4}}>{row.diff} €</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {ficheClient.etudeCalculateur.rentabilite.length > 5 && <div style={{fontSize: 12, color: '#888', marginTop: 2}}>... (voir calculateur pour le détail complet)</div>}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{marginBottom: 10}}>Aucune étude enregistrée.</div>
                      )}
                    </div>
                    <div style={{borderTop: '1px solid #e5e7eb', margin: '18px 0 18px 0'}} />
                    {/* Ajout bouton et formulaire RDV */}
                    <div style={{ margin: '24px 0' }}>
                      <button
                        className="btn green"
                        onClick={() => setShowRdvNoteForm((v) => !v)}
                        style={{
                          marginBottom: 10,
                          background: 'linear-gradient(90deg,#2563eb 0%,#10b981 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '14px 28px',
                          fontWeight: 700,
                          fontSize: 18,
                          boxShadow: '0 2px 12px #2563eb22',
                          cursor: 'pointer',
                          transition: 'background 0.18s, color 0.18s',
                          letterSpacing: 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span style={{fontSize: 22}}>📝</span>
                        {showRdvNoteForm ? 'Fermer le formulaire RDV' : 'Ajouter un compte-rendu RDV'}
                      </button>
                      {showRdvNoteForm && (
                        <RdvNoteForm
                          commercial={{ id: ficheClient.emailCommercial, nom: ficheClient.commercial }}
                          manager={{ id: ficheClient.managerId, email: ficheClient.managerEmail }}
                          rdvId={ficheClient.id}
                        />
                      )}
                      <RdvNotesList clientId={ficheClient.id} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
