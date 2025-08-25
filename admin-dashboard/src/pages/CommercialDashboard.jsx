import React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Bar, BarChart, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';


// --- Dashboard Commercial ---

export default function CommercialDashboard() {

  // Onglets du dashboard
  const [activeTab, setActiveTab] = React.useState('dashboard');

  // États pour clients et commerciaux (utilisés dans PerformanceSection)
  const [clients, setClients] = React.useState([]);
  const [commerciaux, setCommerciaux] = React.useState([]);

  // Exemple de stats (à remplacer par tes vraies données)
  const caMois = 24500;
  const ventesMois = 12;
  const salaireFixe = 1500;
  const commission = 0.05; // 5%
  const totalCommission = caMois * commission;
  const salaireTotal = salaireFixe + totalCommission;

  // Données pour le graphique (exemple)
  const months = [
    { label: 'Jan', CA: 18000, ventes: 8 },
    { label: 'Fév', CA: 22000, ventes: 10 },
    { label: 'Mar', CA: 24500, ventes: 12 },
    { label: 'Avr', CA: 21000, ventes: 9 },
    { label: 'Mai', CA: 23000, ventes: 11 },
    { label: 'Juin', CA: 20000, ventes: 8 },
  ];

  // Récupération des données Firestore pour clients et commerciaux
  React.useEffect(() => {
    getDocs(collection(db, 'clients')).then(snap => {
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    getDocs(collection(db, 'users')).then(snap => {
      setCommerciaux(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div style={{ padding: 40 }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
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
          Mon dashboard
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          style={{
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
      </div>

      {/* Onglet Mes clients supprimé de la page dashboard, présent uniquement dans le header */}

      {/* Dashboard principal */}
      {activeTab === 'dashboard' && (
        <div>
          {/* ...stats, graphiques, etc. à compléter selon l'ancien code... */}
          <h2>Statistiques générales</h2>
          {/* ...exemple de stats... */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 40 }}>
            {/* ...cartes stats... */}
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '6px solid #3b82f6' }}>
              <div style={{ color: '#6b7280', fontSize: 14 }}>CA total du mois</div>
              <div style={{ color: '#3b82f6', fontSize: 28, fontWeight: 700 }}>{caMois.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '6px solid #10b981' }}>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Ventes du mois</div>
              <div style={{ color: '#10b981', fontSize: 28, fontWeight: 700 }}>{ventesMois}</div>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '6px solid #6366f1' }}>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Salaire total</div>
              <div style={{ color: '#6366f1', fontSize: 28, fontWeight: 700 }}>{salaireTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
            </div>
          </div>
          {/* Graphique CA & Ventes (exemple, à remplacer par ton vrai composant) */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 40 }}>
            <h3 style={{ marginBottom: 16 }}>📊 CA & Ventes (6 derniers mois)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={months} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <XAxis dataKey="label" tick={{ fontSize: 15, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 15, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('fr-FR') : v} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 15, color: '#334155' }} />
                <Bar dataKey="CA" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={28} name="CA (€)">
                  <LabelList dataKey="CA" position="top" formatter={(v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
                </Bar>
                <Bar dataKey="ventes" fill="#10b981" radius={[8, 8, 0, 0]} barSize={18} name="Ventes">
                  <LabelList dataKey="ventes" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Performance commerciale */}
      {activeTab === 'performance' && (
        <PerformanceSection clients={clients} commerciaux={commerciaux} />
      )}

      {/* Stats équipe */}
      {activeTab === 'statsEquipe' && (
        <div>
          <h2>Stats équipe</h2>
          {/* --- Cartes d'équipe par manager --- */}
          <EquipeStatsSection />
        </div>
      )}

      {/* Modals, upload, fiche client, etc. (hors gestion clients) */}
      {/* ...modals, upload, fiche client, etc. à compléter selon l'ancien code... */}
    </div>
  );
}

// --- Section Performance ---
function PerformanceSection({ clients, commerciaux }) {
  // Génère des fausses ventes pour juillet 2025, mais utilise les utilisateurs réels Firebase
  const professions = ['Artisan', 'Comptable', 'Retraité', 'Professeur', 'Cadre', 'Médecin', 'Commerçant', 'Infirmière', 'Ingénieur', 'Avocat'];
  function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randomProf() { return professions[randomInt(0, professions.length - 1)]; }
  // Utilisateurs réels Firebase avec rôle commercial, Manager ou Admin (case insensitive, sans doublons d'email)
  const realCommerciaux = [];
  const seenEmails = new Set();
  commerciaux.forEach(com => {
    const role = (com.role || '').toLowerCase();
    if ((role === 'commercial' || role === 'manager' || role === 'admin') && com.email && !seenEmails.has(com.email)) {
      realCommerciaux.push(com);
      seenEmails.add(com.email);
    }
  });
  // Pour chaque commercial réel, génère entre 2 et 6 ventes aléatoires en juillet 2025
  const fakeClients = realCommerciaux.flatMap(com => {
    const nbVentes = randomInt(2, 6);
    return Array.from({ length: nbVentes }).map((_, i) => {
      const prix = randomInt(5000, 20000);
      const day = randomInt(1, 28);
      return {
        id: `${com.id}-juillet-${i}`,
        nom: `Client${com.nom || ''}${i+1}`,
        prenom: `Prénom${i+1}`,
        statut: 'Vendu',
        prixCentrale: prix,
        dateVente: `2025-07-${day.toString().padStart(2, '0')}`,
        emailCommercial: com.email,
        professionMr: randomProf(),
        professionMme: randomProf()
      };
    });
  });
  // Utilise les fausses données si aucune vente réelle pour la période sélectionnée
  const [selectedMonth, setSelectedMonth] = React.useState(7);
  const [selectedYear, setSelectedYear] = React.useState(2025);
  // Vérifie s'il y a des ventes réelles pour la période sélectionnée
  const hasRealSales = clients.some(c => {
    const d = c.dateVente ? new Date(c.dateVente) : null;
    return d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé');
  });
  const isFake = !hasRealSales;
  const allClients = isFake ? fakeClients : clients;
  // Pour juillet 2025, utilise les utilisateurs réels Firebase
  const allCommerciaux = isFake
    ? realCommerciaux.map(com => ({ ...com, displayName: com.email }))
    : realCommerciaux;

  // Filtre de mois
  // Toujours initialiser sur juillet 2025
  // (déjà déclaré plus haut, donc on retire cette duplication)
  const monthsList = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];

  // Stats du mois sélectionné
  const statsMois = allCommerciaux.map(com => {
    const commClients = allClients.filter(c => c.emailCommercial === com.email || c.emailCom === com.email);
    const caMois = commClients.reduce((sum, c) => {
      const d = c.dateVente ? new Date(c.dateVente) : null;
      if (d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé')) {
        return sum + (parseFloat(c.prixCentrale) || 0);
      }
      return sum;
    }, 0);
    let displayName;
    if (isFake) {
      displayName = com.email;
    } else {
      displayName = com.nom && com.prenom ? `${com.nom} ${com.prenom}` : (com.nom || com.prenom || com.email);
    }
    return {
      ...com,
      caMois,
      displayName
    };
  });
  const topCommerciauxMois = statsMois.filter(com => com.caMois > 0).sort((a, b) => b.caMois - a.caMois);
  const podiumMois = topCommerciauxMois.slice(0, 5);
  const top10Mois = topCommerciauxMois.slice(0, 10);

  // Stats cumul annuel
  const statsAnnuel = allCommerciaux.map(com => {
    const commClients = allClients.filter(c => c.emailCommercial === com.email || c.emailCom === com.email);
    const caAnnee = commClients.reduce((sum, c) => {
      const d = c.dateVente ? new Date(c.dateVente) : null;
      if (d && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé')) {
        return sum + (parseFloat(c.prixCentrale) || 0);
      }
      return sum;
    }, 0);
    let displayName;
    if (isFake) {
      displayName = com.email;
    } else {
      displayName = com.nom && com.prenom ? `${com.nom} ${com.prenom}` : (com.nom || com.prenom || com.email);
    }
    return {
      ...com,
      caAnnee,
      displayName
    };
  });
  const topCommerciauxAnnuel = statsAnnuel.filter(com => com.caAnnee > 0).sort((a, b) => b.caAnnee - a.caAnnee);
  const podiumAnnuel = topCommerciauxAnnuel.slice(0, 5);
  const top10Annuel = topCommerciauxAnnuel.slice(0, 10);

  return (
    <>
      <div>
        <h2>Performance commerciale</h2>
        {/* Filtre de mois */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: '#334155' }}>Mois :</span>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          style={{ fontSize: 16, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#334155', fontWeight: 500 }}
        >
          {monthsList.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#334155' }}>Année :</span>
        <input
          type="number"
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          min={2020}
          max={2030}
          style={{ fontSize: 16, width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#334155', fontWeight: 500 }}
        />
        </div>
        {/* Podium du mois */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 32, marginTop: 24, justifyContent: 'center', alignItems: 'flex-end' }}>
          {podiumMois.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 18, textAlign: 'center', width: '100%' }}>
              Aucun vendeur n'a réalisé de CA ce mois-ci.<br />Motivez votre équipe pour apparaître sur le podium !
            </div>
          ) : podiumMois.map((com, idx) => {
            let bg, emoji, size, shadow, border, crown;
            if (idx === 0) {
              bg = 'linear-gradient(135deg, #ffe066 60%, #fffbe6 100%)';
              emoji = '🏆';
              size = 140;
              shadow = '0 6px 24px #facc1533';
              border = '4px solid #ffd700';
              crown = <span style={{ fontSize: 32, position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)' }}>👑</span>;
            } else if (idx === 1) {
              bg = 'linear-gradient(135deg, #e0e7ff 60%, #f8fafc 100%)';
              emoji = '🥈';
              size = 120;
              shadow = '0 4px 16px #a3a3a333';
              border = '4px solid #c0c0c0';
              crown = null;
            } else if (idx === 2) {
              bg = 'linear-gradient(135deg, #fca5a5 60%, #fff7ed 100%)';
              emoji = '🥉';
              size = 120;
              shadow = '0 4px 16px #f59e4233';
              border = '4px solid #cd7f32';
              crown = null;
            } else {
              bg = '#f1f5f9';
              emoji = '';
              size = 100;
              shadow = '0 2px 8px #2563eb22';
              border = '2px solid #e5e7eb';
              crown = null;
            }
            return (
              <div
                key={com.email}
                style={{
                  background: bg,
                  borderRadius: 18,
                  boxShadow: shadow,
                  padding: 22,
                  minWidth: size,
                  maxWidth: 180,
                  textAlign: 'center',
                  border,
                  position: 'relative',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  cursor: 'pointer',
                  marginTop: idx === 0 ? 0 : 20,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.07)';
                  e.currentTarget.style.boxShadow = '0 12px 32px #2563eb33';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = shadow;
                }}
              >
                {crown}
                <div style={{ fontWeight: 700, fontSize: 22, color: '#6366f1', marginBottom: 6, letterSpacing: 1 }}>{emoji} #{idx + 1}</div>
                <div style={{ fontWeight: 600, fontSize: 18, color: '#334155', marginBottom: 4 }}>{com.displayName}</div>
                <div style={{ fontSize: 15, color: '#64748b', marginBottom: 6 }}>CA du mois</div>
                <div style={{ fontSize: 22, color: '#2563eb', fontWeight: 700 }}>{com.caMois.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
              </div>
            );
          })}
        </div>
        {/* Bar chart top 10 du mois */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16 }}>Top 10 vendeurs du mois (CA)</h3>
          {top10Mois.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 17, textAlign: 'center', margin: '32px 0' }}>
              Aucun vendeur n'a réalisé de CA ce mois-ci.<br />Le graphique s'affichera dès qu'une vente sera enregistrée.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top10Mois} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <XAxis dataKey="displayName" tick={{ fontSize: 15, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 15, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : v} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 15, color: '#334155' }} />
                <Bar dataKey="caMois" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={28} name="CA (€)">
                  <LabelList dataKey="caMois" position="top" formatter={(v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Podium et graphique cumul annuel */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #2563eb11', marginBottom: 40 }}>
          <h3 style={{ marginBottom: 16, color: '#334155' }}>Podium cumul annuel ({selectedYear})</h3>
          <div style={{ display: 'flex', gap: 28, marginBottom: 32, marginTop: 12, justifyContent: 'center', alignItems: 'flex-end' }}>
            {podiumAnnuel.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 18, textAlign: 'center', width: '100%' }}>
                Aucun vendeur n'a réalisé de CA cette année.<br />Le podium annuel s'affichera dès qu'une vente sera enregistrée.
              </div>
            ) : podiumAnnuel.map((com, idx) => {
              let bg, emoji, size, shadow, border, crown;
              if (idx === 0) {
                bg = 'linear-gradient(135deg, #ffe066 60%, #fffbe6 100%)';
                emoji = '🏆';
                size = 140;
                shadow = '0 6px 24px #facc1533';
                border = '4px solid #ffd700';
                crown = <span style={{ fontSize: 32, position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)' }}>👑</span>;
              } else if (idx === 1) {
                bg = 'linear-gradient(135deg, #e0e7ff 60%, #f8fafc 100%)';
                emoji = '🥈';
                size = 120;
                shadow = '0 4px 16px #a3a3a333';
                border = '4px solid #c0c0c0';
                crown = null;
              } else if (idx === 2) {
                bg = 'linear-gradient(135deg, #fca5a5 60%, #fff7ed 100%)';
                emoji = '🥉';
                size = 120;
                shadow = '0 4px 16px #f59e4233';
                border = '4px solid #cd7f32';
                crown = null;
              } else {
                bg = '#f1f5f9';
                emoji = '';
                size = 100;
                shadow = '0 2px 8px #2563eb22';
                border = '2px solid #e5e7eb';
                crown = null;
              }
              return (
                <div
                  key={com.email}
                  style={{
                    background: bg,
                    borderRadius: 18,
                    boxShadow: shadow,
                    padding: 22,
                    minWidth: size,
                    maxWidth: 180,
                    textAlign: 'center',
                    border,
                    position: 'relative',
                    transition: 'transform 0.18s, box-shadow 0.18s',
                    cursor: 'pointer',
                    marginTop: idx === 0 ? 0 : 20,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.07)';
                    e.currentTarget.style.boxShadow = '0 12px 32px #2563eb33';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = shadow;
                  }}
                >
                  {crown}
                  <div style={{ fontWeight: 700, fontSize: 22, color: '#6366f1', marginBottom: 6, letterSpacing: 1 }}>{emoji} #{idx + 1}</div>
                <div style={{ fontWeight: 600, fontSize: 18, color: '#334155', marginBottom: 4 }}>{com.displayName}</div>
                  <div style={{ fontSize: 15, color: '#64748b', marginBottom: 6 }}>CA annuel</div>
                  <div style={{ fontSize: 22, color: '#2563eb', fontWeight: 700 }}>{com.caAnnee.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</div>
                </div>
              );
            })}
          </div>
          {/* Graphique cumul annuel */}
          <h3 style={{ marginBottom: 16 }}>Top 10 vendeurs cumul annuel (CA)</h3>
          {top10Annuel.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 17, textAlign: 'center', margin: '32px 0' }}>
              Aucun vendeur n'a réalisé de CA cette année.<br />Le graphique s'affichera dès qu'une vente sera enregistrée.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={top10Annuel} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <XAxis dataKey="displayName" tick={{ fontSize: 15, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 15, fill: '#64748b' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : v} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 15, color: '#334155' }} />
                <Bar dataKey="caAnnee" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={28} name="CA annuel (€)">
                  <LabelList dataKey="caAnnee" position="top" formatter={(v) => v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </>
  );
}

// --- Composant EquipeStatsSection ---
// (React, useState, useEffect déjà importés en haut du fichier)



function EquipeStatsSection() {
  const [managers, setManagers] = React.useState([]);
  const [clients, setClients] = React.useState([]);
  const [commerciaux, setCommerciaux] = React.useState([]);
  const [selectedManager, setSelectedManager] = React.useState(null);
  const [showDetail, setShowDetail] = React.useState(false);
  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = React.useState(new Date().toISOString().slice(0, 10));

  React.useEffect(() => {
    getDocs(collection(db, 'clients')).then(snap => {
      const allClients = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(allClients);
      const managerEmails = [...new Set(allClients.map(c => c.emailManager).filter(Boolean))];
      setManagers(managerEmails);
    });
    getDocs(collection(db, 'users')).then(snap => {
      setCommerciaux(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  // Calcule les stats d'équipe pour un manager (mois/année)
  const getEquipeStats = (managerEmail) => {
    const teamCommerciaux = commerciaux.filter(com => com.managerEmail === managerEmail);
    // Pour chaque commercial, stats du mois sélectionné
    const statsCommerciaux = teamCommerciaux.map(com => {
      const commClients = clients.filter(c => c.emailCommercial === com.email || c.emailCom === com.email);
      // CA du mois
      const caMois = commClients.reduce((sum, c) => {
        const d = c.dateVente ? new Date(c.dateVente) : null;
        if (d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé')) {
          return sum + (parseFloat(c.prixCentrale) || 0);
        }
        return sum;
      }, 0);
      // Nombre de ventes du mois
      const ventesMois = commClients.filter(c => {
        const d = c.dateVente ? new Date(c.dateVente) : null;
        return d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé');
      }).length;
      // Top 3 professions sur l'année
      const profCount = {};
      commClients.forEach(c => {
        const d = c.dateVente ? new Date(c.dateVente) : null;
        if (d && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé')) {
          [c.professionMr, c.professionMme].filter(Boolean).forEach(p => {
            profCount[p] = (profCount[p] || 0) + 1;
          });
        }
      });
      const topProfs = Object.entries(profCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      // Stats par jour pour chaque commercial
      const rdvByDay = {};
      commClients.forEach(c => {
        const d = c.dateVente ? new Date(c.dateVente) : null;
        if (d) {
          const dayStr = d.toISOString().slice(0, 10);
          if (!rdvByDay[dayStr]) rdvByDay[dayStr] = { pris: 0, faits: 0, vendus: 0 };
          rdvByDay[dayStr].pris++;
          if (c.statut === 'Vendu' || c.statut === 'Signé') rdvByDay[dayStr].vendus++;
          if (c.statut === 'Fait' || c.statut === 'Vendu' || c.statut === 'Signé') rdvByDay[dayStr].faits++;
        }
      });
      return {
        ...com,
        caMois,
        ventesMois,
        topProfs,
        rdvByDay
      };
    });
    // Stats globales équipe
    const equipeClients = clients.filter(c => c.emailManager === managerEmail);
    const ca = equipeClients.reduce((sum, c) => {
      const d = c.dateVente ? new Date(c.dateVente) : null;
      if (d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé')) {
        return sum + (parseFloat(c.prixCentrale) || 0);
      }
      return sum;
    }, 0);
    const rdvPris = equipeClients.filter(c => {
      const d = c.dateVente ? new Date(c.dateVente) : null;
      return d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
    }).length;
    const rdvFaits = equipeClients.filter(c => {
      const d = c.dateVente ? new Date(c.dateVente) : null;
      return d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && (c.statut === 'Vendu' || c.statut === 'Signé');
    }).length;
    const ventes = equipeClients.filter(c => {
      const d = c.dateVente ? new Date(c.dateVente) : null;
      return d && d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear && c.statut === 'Vendu';
    }).length;
    return { ca, rdvPris, rdvFaits, ventes, commerciaux: statsCommerciaux, equipe: equipeClients };
  };

  // Section détail de la journée en cours (filtrable)
  const renderDaySection = () => (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ color: '#334155', marginBottom: 12 }}>Détail de la journée</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#334155' }}>Date :</span>
        <input
          type="date"
          value={selectedDay}
          onChange={e => setSelectedDay(e.target.value)}
          style={{ fontSize: 16, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#334155', fontWeight: 500 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {managers.map(email => {
          const stats = getEquipeStats(email);
          return (
            <div key={email} style={{ background: '#f1f5f9', borderRadius: 12, boxShadow: '0 2px 8px #2563eb11', padding: 18, minWidth: 320, borderLeft: '6px solid #6366f1', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#6366f1', marginBottom: 6 }}>Manager : {email}</div>
              <div style={{ color: '#334155', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Commerciaux attribués :</div>
              {stats.commerciaux.length === 0 ? (
                <div style={{ fontSize: 14, color: '#64748b' }}>Aucun commercial attribué</div>
              ) : stats.commerciaux.map(com => {
                const dayStats = com.rdvByDay[selectedDay] || { pris: 0, faits: 0, vendus: 0 };
                return (
                  <div key={com.email} style={{ marginBottom: 10, padding: '8px 12px', background: '#fff', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 15, marginBottom: 2 }}>{com.nom || com.email}</div>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 2 }}>RDV pris : <b>{dayStats.pris}</b></div>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 2 }}>RDV faits : <b>{dayStats.faits}</b></div>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 2 }}>RDV vendus : <b>{dayStats.vendus}</b></div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Filtre par mois/année pour stats du mois
  const monthsList = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' }
  ];

  // ...existing code...
  return (
    <>
      {/* Section détail de la journée en cours */}
      {renderDaySection()}
      {/* Filtre par mois/année */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#334155' }}>Mois :</span>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          style={{ fontSize: 16, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#334155', fontWeight: 500 }}
        >
          {monthsList.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <span style={{ fontWeight: 600, fontSize: 16, color: '#334155' }}>Année :</span>
        <input
          type="number"
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          min={2020}
          max={2030}
          style={{ fontSize: 16, width: 80, padding: '6px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f8fafc', color: '#334155', fontWeight: 500 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        {managers.map(email => {
          const stats = getEquipeStats(email);
          return (
            <div key={email} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px #2563eb22', padding: 24, minWidth: 340, cursor: 'pointer', borderLeft: '6px solid #6366f1', position: 'relative' }} onClick={() => { setSelectedManager(email); setShowDetail(true); }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: '#6366f1', marginBottom: 6 }}>Manager : {email}</div>
              <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>CA équipe (mois) : <b>{stats.ca.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</b></div>
              <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>RDV pris : <b>{stats.rdvPris}</b></div>
              <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>RDV faits : <b>{stats.rdvFaits}</b></div>
              <div style={{ color: '#64748b', fontSize: 15, marginBottom: 8 }}>Ventes : <b>{stats.ventes}</b></div>
              {/* Commerciaux attribués */}
              <div style={{ marginTop: 10 }}>
                <div style={{ color: '#6366f1', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Commerciaux :</div>
                {stats.commerciaux.length === 0 ? (
                  <div style={{ fontSize: 14, color: '#64748b' }}>Aucun commercial attribué</div>
                ) : stats.commerciaux.map(com => (
                  <div key={com.email} style={{ marginBottom: 12, padding: '10px 14px', background: '#f1f5f9', borderRadius: 8 }}>
                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 15, marginBottom: 2 }}>{com.nom || com.email}</div>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 2 }}>CA du mois : <b>{com.caMois.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</b></div>
                    <div style={{ fontSize: 14, color: '#64748b', marginBottom: 2 }}>Ventes du mois : <b>{com.ventesMois}</b></div>
                    <div style={{ fontSize: 14, color: '#2563eb', marginBottom: 2 }}>Top 3 professions vendues :</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {com.topProfs.length === 0 ? (
                        <li style={{ fontSize: 13, color: '#64748b' }}>Aucune vente enregistrée</li>
                      ) : com.topProfs.map(([prof, count]) => (
                        <li key={prof} style={{ marginBottom: 2, fontSize: 13 }}>
                          <b>{prof}</b> : {count} ventes
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* Détail équipe au clic */}
      {showDetail && selectedManager && (
        <div style={{ background: '#00000066', position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 400, maxWidth: '90vw', boxShadow: '0 10px 30px rgba(0,0,0,0.13)', position: 'relative' }}>
            <button onClick={() => setShowDetail(false)} style={{ position: 'absolute', right: 18, top: 18, background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 22, cursor: 'pointer', color: '#334155', boxShadow: '0 2px 8px #2563eb11' }}>×</button>
            <h3 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center' }}>Équipe de {selectedManager}</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Statut</th>
                  <th>CA</th>
                  <th>Profession Mr</th>
                  <th>Profession Mme</th>
                </tr>
              </thead>
              <tbody>
                {getEquipeStats(selectedManager).equipe && getEquipeStats(selectedManager).equipe.map(c => (
                  <tr key={c.id}>
                    <td>{c.nom}</td>
                    <td>{c.prenom}</td>
                    <td>{c.statut}</td>
                    <td>{c.prixCentrale ? c.prixCentrale + ' €' : '-'}</td>
                    <td>{c.professionMr || '-'}</td>
                    <td>{c.professionMme || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
