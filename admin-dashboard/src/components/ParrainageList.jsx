// ✅ components/ParrainageList.jsx — Version complète & corrigée

import { saveAs } from 'file-saver';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
} from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { db } from '../firebaseConfig';

function ParrainageList() {
  const [parrainages, setParrainages] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('Tous');
  const [villeFilter, setVilleFilter] = useState('Toutes');
  const [searchTerm, setSearchTerm] = useState('');
  const [tab, setTab] = useState('liste');

  useEffect(() => {
    let firstLoad = true;
    const unsubscribe = onSnapshot(
      query(collection(db, 'parrainages'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        if (!firstLoad && data.length > parrainages.length) {
          toast.success('✨ Nouveau parrainage reçu !');
        }
        firstLoad = false;
        setParrainages(data);
      }
    );
    return () => unsubscribe();
  }, [parrainages.length]);

  const loadMore = async () => {
    if (!hasMore) return;
    setLoading(true);
    const q = query(
      collection(db, 'parrainages'),
      orderBy('createdAt', 'desc'),
      startAfter(lastVisible),
      limit(20)
    );
    const snapshot = await getDocs(q);
    const newData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setParrainages((prev) => [...prev, ...newData]);
    setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === 20);
    setLoading(false);
  };

  // ✅ Nouveau : copie vers Clients si statut devient "Signé"
  const changeStatus = async (id, newStatus) => {
    await updateDoc(doc(db, 'parrainages', id), { statut: newStatus });

    if (newStatus === 'Signé') {
      const parrainageDoc = await getDoc(doc(db, 'parrainages', id));
      const p = parrainageDoc.data();
      if (p) {
        // Vérifier si déjà existant ?
        const clientsQuery = query(
          collection(db, 'clients'),
          orderBy('createdAt', 'desc')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const exists = clientsSnapshot.docs.some(
          (c) => c.data().email === p.email
        );
        if (!exists) {
          await addDoc(collection(db, 'clients'), {
            nom: p.nom,
            prenom: p.prenom,
            email: p.email,
            telephone: p.telephone,
            ville: p.ville,
            adresse: '',
            codePostal: '',
            montant: '',
            frequence: 'Mensuel',
            commercial: p.commercial || '',
            provenance: 'Parrainage',
            statutClient: 'En cours',
            createdAt: new Date(),
          });
          toast.success('✅ Client créé automatiquement !');
        }
      }
    }
  };

  const deleteParrainage = async (id) => {
    if (window.confirm('Confirmer la suppression ?')) {
      await deleteDoc(doc(db, 'parrainages', id));
      toast.info('🗑️ Parrainage supprimé.');
    }
  };

  const filtered = parrainages
    .filter((p) => filter === 'Tous' || p.statut === filter)
    .filter((p) => villeFilter === 'Toutes' || p.ville === villeFilter)
    .filter(
      (p) =>
        p.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parrainages');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer]), 'parrainages.xlsx');
  };

  const exportPDF = () => {
    const docPDF = new jsPDF();
    docPDF.text('Liste des Parrainages', 14, 10);
    docPDF.autoTable({
      head: [
        [
          'Nom',
          'Prénom',
          'Email',
          'Téléphone',
          'Ville',
          'Statut',
          'Commercial',
        ],
      ],
      body: filtered.map((p) => [
        p.nom,
        p.prenom,
        p.email,
        p.telephone,
        p.ville,
        p.statut,
        p.commercial || '',
      ]),
    });
    docPDF.save('parrainages.pdf');
  };

  const statsByCommercial = parrainages.reduce((acc, p) => {
    const name = p.commercial || 'Inconnu';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const statsData = Object.keys(statsByCommercial).map((name) => ({
    commercial: name,
    total: statsByCommercial[name],
  }));

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
          alignItems: 'center',
          marginBottom: '30px',
        }}
      >
        <h2 style={{ margin: 0 }}>
          🌟 {tab === 'liste' ? 'Parrainages' : 'Statistiques commerciaux'}
        </h2>
        <img src="/logopur.png" alt="Logo" style={{ height: '50px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          className={`btn ${tab === 'liste' ? 'blue' : 'grey'}`}
          onClick={() => setTab('liste')}
        >
          Liste
        </button>
        <button
          className={`btn ${tab === 'stats' ? 'blue' : 'grey'}`}
          onClick={() => setTab('stats')}
          style={{ marginLeft: '10px' }}
        >
          Statistiques
        </button>
      </div>

      {tab === 'liste' && (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="select"
            >
              {[
                'Tous',
                'Nouveau',
                'RDV Pris',
                'Placé',
                'Signé',
                'Non Signé',
                'Vendu',
                'Installé',
              ].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={villeFilter}
              onChange={(e) => setVilleFilter(e.target.value)}
              className="select"
            >
              <option value="Toutes">Toutes les villes</option>
              {[...new Set(parrainages.map((p) => p.ville))]
                .filter((v) => v)
                .map((ville, idx) => (
                  <option key={idx} value={ville}>
                    {ville}
                  </option>
                ))}
            </select>
            <input
              placeholder="🔍 Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                flex: 1,
              }}
            />
            <button onClick={exportExcel} className="btn green">
              Excel
            </button>
            <button onClick={exportPDF} className="btn blue">
              PDF
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
                  'Ville',
                  'Statut',
                  'Commercial',
                  'Actions',
                ].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  style={{
                    background: p.statut === 'Nouveau' ? '#fff8dc' : '#fff',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <td>{p.nom}</td>
                  <td>{p.prenom}</td>
                  <td>{p.email}</td>
                  <td>{p.telephone}</td>
                  <td>{p.ville}</td>
                  <td>
                    <select
                      value={p.statut}
                      onChange={(e) => changeStatus(p.id, e.target.value)}
                      className="select"
                    >
                      {[
                        'Nouveau',
                        'RDV Pris',
                        'Placé',
                        'Signé',
                        'Non Signé',
                        'Vendu',
                        'Installé',
                      ].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{p.commercial || '-'}</td>
                  <td>
                    <button
                      onClick={() => deleteParrainage(p.id)}
                      className="btn red"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn grey"
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Chargement...' : 'Charger plus'}
            </button>
          )}
        </>
      )}

      {tab === 'stats' && (
        <div style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="commercial" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
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
        .btn.blue { background: #3b82f6; color: white; }
        .btn.red { background: #ef4444; color: white; }
        .btn.grey { background: #64748b; color: white; }
        .select {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid #ddd;
        }
      `}</style>
    </div>
  );
}

export default ParrainageList;
