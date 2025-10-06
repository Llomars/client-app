import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

function ClientsChauds() {
  const [clients, setClients] = useState([]);
  const [accomptes, setAccomptes] = useState({}); // { [clientId]: { acompte1, acompte2 } }
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [allClients, setAllClients] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchClients() {
      setLoading(true);
      const snap = await getDocs(collection(db, 'clients'));
      const chaudClients = [];
      const allClientsArr = [];
      const accomptesObj = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.chaud) {
          chaudClients.push({ id: docSnap.id, ...data });
        }
        allClientsArr.push({ id: docSnap.id, ...data });
        accomptesObj[docSnap.id] = {
          acompte1: data.acompte1 || '',
          acompte2: data.acompte2 || ''
        };
      });
      setClients(chaudClients);
      setAllClients(allClientsArr);
      setAccomptes(accomptesObj);
      setLoading(false);
    }
    fetchClients();
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <h2
        style={{
          color: '#3730a3',
          fontWeight: 900,
          fontSize: 28,
          marginBottom: 24,
        }}
      >
        Clients chauds en cours
      </h2>
      <button
        style={{
          background: '#f59e42',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontWeight: 800,
          fontSize: 16,
          cursor: 'pointer',
          marginBottom: 24,
        }}
        onClick={() => setShowModal(true)}
      >
        Ajouter un client chaud
      </button>
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30,41,59,0.18)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
              padding: 36,
              minWidth: 380,
              maxWidth: 480,
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 18,
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#6366f1',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
            <h3 style={{ color: '#3730a3', fontWeight: 900, fontSize: 22, marginBottom: 18 }}>
              Sélectionner un client à ajouter
            </h3>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou prénom..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: 8,
                border: '1.5px solid #c7d2fe',
                fontSize: 16,
                marginBottom: 14,
              }}
            />
            {modalLoading ? (
              <div>Chargement...</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 10 }}>
                {allClients.filter(c => !c.chaud && ((c.nom || '').toLowerCase().includes(search.toLowerCase()) || (c.prenom || '').toLowerCase().includes(search.toLowerCase()))).length === 0 ? (
                  <div>Aucun client disponible.</div>
                ) : (
                  allClients
                    .filter(c => !c.chaud && ((c.nom || '').toLowerCase().includes(search.toLowerCase()) || (c.prenom || '').toLowerCase().includes(search.toLowerCase())))
                    .map((client) => (
                      <div
                        key={client.id}
                        style={{
                          padding: 8,
                          borderBottom: '1px solid #e0e7ff',
                          cursor: 'pointer',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>
                          <b>{client.nom} {client.prenom}</b> — {client.email}
                        </span>
                        <button
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 18px',
                            fontWeight: 700,
                            fontSize: 15,
                            cursor: 'pointer',
                          }}
                          onClick={async () => {
                            setModalLoading(true);
                            await updateDoc(doc(db, 'clients', client.id), { chaud: true });
                            setClients([...clients, { ...client, chaud: true }]);
                            setShowModal(false);
                            setModalLoading(false);
                          }}
                        >Ajouter</button>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {loading ? (
        <div>Chargement...</div>
      ) : clients.length === 0 ? (
        <div>Aucun client chaud en cours.</div>
      ) : (
        <>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 2px 8px #e0e7ff',
            }}
          >
            <thead>
              <tr style={{ background: '#c7d2fe' }}>
                <th style={{ padding: 8 }}>Nom</th>
                <th style={{ padding: 8 }}>Centrale</th>
                <th style={{ padding: 8 }}>Prix</th>
                <th style={{ padding: 8 }}>Acompte 1</th>
                <th style={{ padding: 8 }}>Acompte 2</th>
                <th style={{ padding: 8 }}>Statut</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} style={{ background: client.statut === 'Vendu' ? '#d1fae5' : '#f1f5f9' }}>
                  <td style={{ padding: 8 }}>
                    {client.nom} {client.prenom}
                  </td>
                  <td style={{ padding: 8 }}>
                    {/* Affiche la dénomination du kit attribué au client */}
                    {(() => {
                      const kits = [
                        { label: '3 KWh 0', value: '3KWh-0' },
                        { label: '3 KWh 1', value: '3KWh-1' },
                        { label: '6 KWh 0', value: '6KWh-0' },
                        { label: '6 KWh 1', value: '6KWh-1' },
                        { label: '6 KWh 2', value: '6KWh-2' },
                        { label: '9 KWh 0', value: '9KWh-0' },
                        { label: '9 KWh 1', value: '9KWh-1' },
                        { label: '9 KWh 2', value: '9KWh-2' },
                        { label: '12 KWh 0', value: '12KWh-0' },
                        { label: '12 KWh 2', value: '12KWh-2' },
                      ];
                      if (client.modeleCentrale) {
                        const kitObj = kits.find(k => k.value === client.modeleCentrale);
                        return kitObj ? kitObj.label : client.modeleCentrale;
                      }
                      return '-';
                    })()}
                  </td>
                  <td style={{ padding: 8 }}>
                    {client.prixCentrale ? client.prixCentrale + ' €' : '-'}
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      value={accomptes[client.id]?.acompte1 || ''}
                      onChange={async e => {
                        const value = e.target.value;
                        setAccomptes(prev => ({
                          ...prev,
                          [client.id]: {
                            ...prev[client.id],
                            acompte1: value
                          }
                        }));
                        await updateDoc(doc(db, 'clients', client.id), { acompte1: value });
                      }}
                      placeholder="Acompte 1 (€)"
                      style={{ width: 90, padding: 4, borderRadius: 6, border: '1px solid #c7d2fe', fontSize: 15 }}
                    />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input
                      type="number"
                      value={accomptes[client.id]?.acompte2 || ''}
                      onChange={async e => {
                        const value = e.target.value;
                        setAccomptes(prev => ({
                          ...prev,
                          [client.id]: {
                            ...prev[client.id],
                            acompte2: value
                          }
                        }));
                        await updateDoc(doc(db, 'clients', client.id), { acompte2: value });
                      }}
                      placeholder="Acompte 2 (€)"
                      style={{ width: 90, padding: 4, borderRadius: 6, border: '1px solid #c7d2fe', fontSize: 15 }}
                    />
                  </td>
                  <td style={{ padding: 8 }}>{client.statut || 'En attente'}</td>
                  <td style={{ padding: 8 }}>
                    <button
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      onClick={async () => {
                        await updateDoc(doc(db, 'clients', client.id), {
                          chaud: false,
                        });
                        setClients(clients.filter((c) => c.id !== client.id));
                      }}
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Prix total et acompte sous le tableau */}
          <div style={{ marginTop: 24, fontSize: 18, fontWeight: 700, color: '#3730a3', background: '#f1f5f9', borderRadius: 8, padding: 18 }}>
            Prix total des centrales : {' '}
            {clients.length > 0
              ? clients.reduce((acc, c) => acc + (Number(c.prixCentrale) || 0), 0).toLocaleString() + ' €'
              : '-'}
            <br />
            Prix total des acomptes (moitié du total - acompte 1 perçu) : {' '}
            {clients.length > 0
              ? (
                  (clients.reduce((acc, c) => acc + (Number(c.prixCentrale) || 0), 0) / 2)
                  - clients.reduce((acc, c) => acc + (Number(accomptes[c.id]?.acompte1) || 0), 0)
                ).toLocaleString() + ' €'
              : '-'}
          </div>
        </>
      )}
    </div>
  );
}

export default ClientsChauds;
