
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';

export default function Logistique() {
  // Suivi des clients affectés (pour la coloration et le bouton)
  const [affectes, setAffectes] = useState({});
  const [clients, setClients] = useState([]);
  const [stock, setStock] = useState({});
  const stockItems = [
    { key: 'panneaux', label: 'Panneaux' },
    { key: 'rails', label: 'Rails' },
    { key: 'cables-solaires', label: 'Câbles solaires' },
    { key: 'cle-wifi', label: 'Clé wifi' },
    { key: 'coffret-acdc-16a', label: 'Coffret AC/DC 16 Amp' },
    { key: 'coffret-acdc-32a', label: 'Coffret AC/DC 32 Amp' },
    { key: 'onduleur-3kw', label: 'Onduleur 3kW' },
    { key: 'onduleur-6kw', label: 'Onduleur 6kW' },
    { key: 'batterie-5kwh', label: 'Batterie 5kWh' },
    { key: 'batterie-10kwh', label: 'Batterie 10kWh' },
  ];
  const [editStock, setEditStock] = useState(Object.fromEntries(stockItems.map(i => [i.key, true])));
  const [addStock, setAddStock] = useState(Object.fromEntries(stockItems.map(i => [i.key, ''])));

  // Détecte si un stock est négatif pour afficher l'alerte
  const materielManquant = stockItems.some(({ key }) => {
    const clientsAffectes = clients.filter(c => affectes[c.id]);
    let totalAttribue = 0;
    if (key === 'panneaux') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.panneaux || 0), 0);
    else if (key === 'rails') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.rails || 0), 0);
    else if (key === 'cle-wifi') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['cle-wifi'] || 0), 0);
    else if (key === 'onduleur-3kw') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['onduleur-3kw'] || 0), 0);
    else if (key === 'onduleur-6kw') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['onduleur-6kw'] || 0), 0);
    else if (key === 'batterie-5kwh') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['batterie-5kwh'] || 0), 0);
    else if (key === 'batterie-10kwh') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['batterie-10kwh'] || 0), 0);
    else if (key === 'cables-solaires') totalAttribue = 0;
    else if (key.startsWith('coffret-acdc')) totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.[key] || 0), 0);
    const stockInitial = stock[key]?.stockInitial ?? stock[key]?.quantite ?? 0;
    return (stockInitial - totalAttribue) < 0;
  });

  // Récupère la liste des clients (à adapter selon ta structure Firestore)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'clients'), snap => {
      const cs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(cs);
      // Synchronise l'état d'affectation local avec la base
      const aff = {};
      cs.forEach(c => { if (c.affecte) aff[c.id] = true; });
      setAffectes(aff);
    });
    return () => unsub();
  }, []);

  // Récupère le stock (ex: collection 'stock')
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stock'), snap => {
      const s = {};
      snap.docs.forEach(d => {
        s[d.id] = d.data();
        // Si stockInitial n'existe pas, l'initialise à la valeur actuelle
        if (s[d.id].stockInitial === undefined && s[d.id].quantite !== undefined) {
          s[d.id].stockInitial = s[d.id].quantite;
        }
      });
      setStock(s);
    });
    return () => unsub();
  }, []);



  // Calcule les besoins matériels pour un client à partir de ses choix
  function besoinsClient(client) {
    // Si besoinsPanneaux est '-' ou undefined, on ne compte pas
    const panneaux = (client.besoinsPanneaux === undefined || client.besoinsPanneaux === '-') ? 0 : client.besoinsPanneaux;
    const onduleur = client.besoinsOnduleur || '';
    const batterie = client.besoinsBatterie || '';
    return { panneaux, onduleur, batterie };
  }


  // ...variable total supprimée (non utilisée)...

  // Affecte tout le matériel nécessaire au client et décrémente le stock pour tous les items
  const handleAffecterTout = async (client) => {
    // Récupère les besoins du client pour chaque item du stock
    const besoins = {
      panneaux: (client.besoinsPanneaux === undefined || client.besoinsPanneaux === '-') ? 0 : Number(client.besoinsPanneaux),
      rails: client.besoinsRails ? Number(client.besoinsRails) : 0,
      'cle-wifi': client.besoinsCleWifi && client.besoinsCleWifi !== '-' ? Number(client.besoinsCleWifi) : 0,
      'onduleur-3kw': client.besoinsOnduleur === '3kW' || client.besoinsOnduleur === '3kW+6kW' ? 1 : 0,
      'onduleur-6kw': client.besoinsOnduleur === '6kW' || client.besoinsOnduleur === '3kW+6kW' ? 1 : 0,
      'batterie-5kwh': client.besoinsBatterie === '5kWh' ? 1 : 0,
      'batterie-10kwh': client.besoinsBatterie === '10kWh' ? 1 : 0,
      'cables-solaires': 0, // à adapter si besoin
      'coffret-acdc-16a': (client.besoinsCoffretACDC === '16 Amp' || client.besoinsCoffretACDC === '32+16 Amp') ? 1 : 0,
      'coffret-acdc-32a': (client.besoinsCoffretACDC === '32 Amp' || client.besoinsCoffretACDC === '32+16 Amp') ? 1 : 0,
      'coffret-acdc-36a': client.besoinsCoffretACDC === '36 Amp' ? 1 : 0,
    };
    // Met à jour le client (logistique)
    const logistiqueMaj = {};
    for (const { key } of stockItems) {
      logistiqueMaj[key] = besoins[key] || 0;
    }
    // ...variable ancienLogistique supprimée (non utilisée)...
    // Ne modifie plus le stock (stockInitial ne bouge jamais)
    await setDoc(doc(db, 'clients', client.id), {
      ...client,
      logistique: logistiqueMaj,
      affecte: true
    }, { merge: true });
    setAffectes(a => ({ ...a, [client.id]: true }));
  };

  // Fonction pour reset tous les clients
  const handleResetAll = async () => {
    for (const client of clients) {
      await setDoc(doc(db, 'clients', client.id), { ...client, kit: null, affecte: false, logistique: {} }, { merge: true });
    }
    // Reset local state
    setAffectes({});
  };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Logistique - Affectation du matériel</h2>
        <button
          onClick={handleResetAll}
          style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, fontSize: 16, marginLeft: 24, cursor: 'pointer' }}
        >
          Tout reset
        </button>
      </div>
      <h3>Stock disponible</h3>
      {materielManquant && (
        <div style={{ color: '#dc2626', fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
          Matériel à commander
        </div>
      )}
      <table style={{ borderCollapse: 'collapse', marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Élément</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Stock initial</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Stock restant</th>
            <th style={{ border: '1px solid #ddd', padding: 6 }}>Ajouter</th>
          </tr>
        </thead>
        <tbody>
          {stockItems.map(({ key, label }) => {
            const clientsAffectes = clients.filter(c => affectes[c.id]);
            let totalAttribue = 0;
            if (key === 'panneaux') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.panneaux || 0), 0);
            else if (key === 'rails') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.rails || 0), 0);
            else if (key === 'cle-wifi') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['cle-wifi'] || 0), 0);
            else if (key === 'onduleur-3kw') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['onduleur-3kw'] || 0), 0);
            else if (key === 'onduleur-6kw') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['onduleur-6kw'] || 0), 0);
            else if (key === 'batterie-5kwh') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['batterie-5kwh'] || 0), 0);
            else if (key === 'batterie-10kwh') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['batterie-10kwh'] || 0), 0);
            else if (key === 'cables-solaires') totalAttribue = 0;
            else if (key.startsWith('coffret-acdc')) totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.[key] || 0), 0);
            const stockInitial = stock[key]?.stockInitial ?? stock[key]?.quantite ?? 0;
            const stockRestant = stockInitial - totalAttribue;
            return (
              <tr key={key}>
                <td style={{ border: '1px solid #ddd', padding: 6 }}>{label}</td>
                <td style={{ border: '1px solid #ddd', padding: 6 }}>
                  {editStock[key] ? (
                    <input
                      type="number"
                      min={0}
                      value={stockInitial}
                      autoFocus
                      onChange={async e => {
                        await setDoc(doc(db, 'stock', key), { ...stock[key], stockInitial: Number(e.target.value) }, { merge: true });
                      }}
                      onBlur={() => setEditStock(s => ({ ...s, [key]: false }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') setEditStock(s => ({ ...s, [key]: false }));
                      }}
                      style={{ width: 80, borderRadius: 6, border: '1px solid #ddd', padding: 4 }}
                    />
                  ) : (
                    <>
                      <span style={{ color: stockRestant < 0 ? '#dc2626' : stockRestant === 0 ? '#222' : '#16a34a', fontWeight: 600 }}>{stockInitial}</span>
                      <button
                        onClick={() => setEditStock(s => ({ ...s, [key]: true }))}
                        style={{ marginLeft: 8, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 10px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Modifier
                      </button>
                    </>
                  )}
                </td>
                <td style={{ border: '1px solid #ddd', padding: 6, color: stockRestant < 0 ? '#dc2626' : stockRestant === 0 ? '#222' : '#16a34a', fontWeight: 600 }}>{stockRestant}</td>
                <td style={{ border: '1px solid #ddd', padding: 6 }}>
                  <input
                    type="number"
                    min={1}
                    value={addStock[key]}
                    onChange={e => setAddStock(s => ({ ...s, [key]: e.target.value }))}
                    placeholder={"Ajouter"}
                    style={{ width: 60, borderRadius: 6, border: '1px solid #ddd', padding: 4 }}
                  />
                  <button
                    onClick={async () => {
                      const toAdd = Number(addStock[key]);
                      if (!toAdd) return;
                      await setDoc(doc(db, 'stock', key), { ...stock[key], quantite: (stock[key]?.quantite || 0) + toAdd }, { merge: true });
                      setAddStock(s => ({ ...s, [key]: '' }));
                    }}
                    style={{ marginLeft: 4, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 10px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Ajouter
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Message d'alerte si certains éléments sont en négatif */}
      {(() => {
        const elementsNegatifs = stockItems.filter(({ key }) => {
          const clientsAffectes = clients.filter(c => affectes[c.id]);
          let totalAttribue = 0;
          if (key === 'panneaux') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.panneaux || 0), 0);
          else if (key === 'rails') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.rails || 0), 0);
          else if (key === 'cle-wifi') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['cle-wifi'] || 0), 0);
          else if (key === 'onduleur-3kw') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['onduleur-3kw'] || 0), 0);
          else if (key === 'onduleur-6kw') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['onduleur-6kw'] || 0), 0);
          else if (key === 'batterie-5kwh') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['batterie-5kwh'] || 0), 0);
          else if (key === 'batterie-10kwh') totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.['batterie-10kwh'] || 0), 0);
          else if (key === 'cables-solaires') totalAttribue = 0;
          else if (key.startsWith('coffret-acdc')) totalAttribue = clientsAffectes.reduce((acc, c) => acc + (c.logistique?.[key] || 0), 0);
          const stockInitial = stock[key]?.stockInitial ?? stock[key]?.quantite ?? 0;
          const stockRestant = stockInitial - totalAttribue;
          return stockRestant < 0;
        });
        if (elementsNegatifs.length === 0) return null;
        return (
          <div style={{ color: '#dc2626', fontWeight: 600, margin: '16px 0', fontSize: 17 }}>
            Il faut commander : {elementsNegatifs.map(e => e.label).join(', ')}
          </div>
        );
      })()}
      <h3>Besoins logistiques globaux</h3>
      <ul>
        {stockItems.map(({ key, label }) => {
          // On ne compte que les clients affectés
          const clientsAffectes = clients.filter(c => affectes[c.id]);
          let totalBesoins = 0;
          clientsAffectes.forEach(c => {
            const kit = c.kit || '';
            // Sépare la puissance et le nombre de batterie
            const [puissance, batterieStr] = kit.split(' ');
            const batterieNum = Number(batterieStr);
            let nbOnduleurs = 0;
            if (puissance === '3KWh') {
              if (key === 'panneaux') totalBesoins += 6;
              if (key === 'onduleur-3kw') { totalBesoins += 1; nbOnduleurs = 1; }
              if (key === 'coffret-acdc-16a') totalBesoins += 1;
            } else if (puissance === '6KWh') {
              if (key === 'panneaux') totalBesoins += 12;
              if (key === 'onduleur-6kw') { totalBesoins += 1; nbOnduleurs = 1; }
              if (key === 'coffret-acdc-32a') totalBesoins += 1;
            } else if (puissance === '9KWh') {
              if (key === 'panneaux') totalBesoins += 18;
              if (key === 'onduleur-3kw') { totalBesoins += 1; nbOnduleurs += 1; }
              if (key === 'onduleur-6kw') { totalBesoins += 1; nbOnduleurs += 1; }
              if (key === 'coffret-acdc-16a') totalBesoins += 1;
              if (key === 'coffret-acdc-32a') totalBesoins += 1;
            } else if (puissance === '12KWh') {
              if (key === 'panneaux') totalBesoins += 24;
              if (key === 'onduleur-6kw') { totalBesoins += 2; nbOnduleurs = 2; }
              if (key === 'coffret-acdc-32a') totalBesoins += 2;
            }
            // Batterie selon le chiffre
            if (key === 'batterie-5kwh' && batterieNum === 1) totalBesoins += 1;
            if (key === 'batterie-10kwh' && batterieNum === 2) totalBesoins += 1;
            // Clé wifi selon le nombre d'onduleurs
            if (key === 'cle-wifi') {
              // Pour 9KWh, il y a 2 onduleurs
              if (puissance === '9KWh') totalBesoins += 2;
              else if (puissance === '12KWh') totalBesoins += 2;
              else if (nbOnduleurs === 1) totalBesoins += 1;
            }
          });
          return (
            <li key={key}>{label} à prévoir : {totalBesoins}</li>
          );
        })}
      </ul>
      
      <h3>Clients</h3>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Nom</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Puissance installée</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Type</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Besoins</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>Affectation</th>
          </tr>
        </thead>
        <tbody>
          {clients.map(client => {
            // const besoins = besoinsClient(client); // non utilisé
            const isAffecte = affectes[client.id];
            return (
              <tr key={client.id}>
                <td style={{ border: '1px solid #ddd', padding: 8, background: isAffecte ? '#fde68a' : undefined }}>{client.nom || client.email || client.id}</td>
                <td style={{ border: '1px solid #ddd', padding: 8, background: isAffecte ? '#fde68a' : undefined }}>{client.puissanceInstallee || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: 8, background: isAffecte ? '#fde68a' : undefined }}>{client.type || '-'}</td>
                <td style={{ border: '1px solid #ddd', padding: 8, background: isAffecte ? '#fde68a' : undefined }}>
                  <label>Kit : </label>
                  <select
                    value={client.kit || ''}
                    onChange={async e => {
                      await setDoc(doc(db, 'clients', client.id), { ...client, kit: e.target.value }, { merge: true });
                    }}
                    style={{ minWidth: 120 }}
                  >
                    <option value="">-</option>
                    <option value="3KWh 0">3KWh 0</option>
                    <option value="3KWh 1">3KWh 1</option>
                    <option value="6KWh 0">6KWh 0</option>
                    <option value="6KWh 1">6KWh 1</option>
                    <option value="6KWh 2">6KWh 2</option>
                    <option value="9KWh 0">9KWh 0</option>
                    <option value="9KWh 1">9KWh 1</option>
                    <option value="9KWh 2">9KWh 2</option>
                    <option value="12KWh 0">12KWh 0</option>
                    <option value="12KWh 1">12KWh 1</option>
                    <option value="12KWh 2">12KWh 2</option>
                  </select>
                </td>
                <td style={{ border: '1px solid #ddd', padding: 8, background: isAffecte ? '#fde68a' : undefined }}>
                  {isAffecte ? (
                    <button
                      onClick={async () => {
                        // Reset : retire le kit et l'affectation
                        await setDoc(doc(db, 'clients', client.id), { ...client, kit: null, affecte: false, logistique: {} }, { merge: true });
                        setAffectes(a => ({ ...a, [client.id]: false }));
                      }}
                      style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Reset
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAffecterTout(client)}
                      style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Affecter tout
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
