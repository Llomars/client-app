import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import './ClientsList.css';

// Exemple de données clients
const initialClients = [
  {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@email.com',
    statut: 'En cours', // ou 'Vendu'
    ca: 12000,
  },
  {
    id: 2,
    nom: 'Martin',
    prenom: 'Sophie',
    email: 'sophie.martin@email.com',
    statut: 'Vendu',
    ca: 8000,
  },
];

export default function ClientsList() {
  const [clients, setClients] = useState(initialClients);

  // Callback pour passer en vendu
  const handleVendu = (id) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, statut: 'Vendu' } : c
      )
    );
    // TODO: comptabiliser la vente et mettre à jour le CA dans le dashboard
  };

  // Callback pour annuler la vente
  const handleAnnulerVente = (id) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, statut: 'En cours' } : c
      )
    );
    // TODO: retirer la vente et mettre à jour le CA dans le dashboard
  };

  return (
    <div>
      <h2>Clients</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Email</th>
            <th>Statut</th>
            <th>CA (€)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.nom}</td>
              <td>{client.prenom}</td>
              <td>{client.email}</td>
              <td>{client.statut}</td>
              <td>{client.statut === 'Vendu' ? client.ca : '-'}</td>
              <td>
                <button className="btn blue">Modifier</button>{' '}
                <button className="btn red">Supprimer</button>{' '}
                <button className="btn grey">Importer des docs</button>{' '}
                <button className="btn grey">Débrief RDV</button>{' '}
                {client.statut === 'Vendu' ? (
                  <button className="btn orange" onClick={() => handleAnnulerVente(client.id)}>
                    Annuler vente
                  </button>
                ) : (
                  <button className="btn green" style={{ background: 'yellow', color: 'red', border: '2px solid red' }} onClick={() => handleVendu(client.id)}>
                    Vendu (test)
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Affichage des boutons Vendu/Annuler vente sous chaque fiche client */}
      {clients.map((client) => (
        <div key={client.id} style={{ margin: '16px 0', padding: '16px', background: '#f7fafd', borderRadius: '8px' }}>
          <div><b>{client.nom} {client.prenom}</b> — {client.email}</div>
          {/* ...autres infos client... */}
          <div style={{ marginTop: 8 }}>
            <button className="btn blue">Modifier</button>{' '}
            <button className="btn red">Supprimer</button>{' '}
            <button className="btn grey">Importer des docs</button>{' '}
            <button className="btn grey">Débrief RDV</button>{' '}
            {client.statut === 'Vendu' ? (
              <button className="btn orange" onClick={() => handleAnnulerVente(client.id)}>
                Annuler vente
              </button>
            ) : (
              <button className="btn green" onClick={() => handleVendu(client.id)}>
                Vendu
              </button>
            )}
          </div>
        </div>
      ))}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
