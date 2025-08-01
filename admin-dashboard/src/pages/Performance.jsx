// Performance.jsx - version enrichie avec podium animé, badge, graphique et simulation de données
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { auth, db } from '../firebaseConfig';

export default function Performance() {
  const [user, setUser] = useState(null);
  const [topVendeurs, setTopVendeurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const moisActuel = new Date().toISOString().slice(0, 7);

    const q = query(
      collection(db, 'statsVendeurs'),
      where('mois', '==', moisActuel)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        let data = snapshot.docs.map((doc) => doc.data());

        // 🔁 Simulation si Firestore vide (dev only)
        if (data.length === 0) {
          data = Array.from({ length: 10 }, (_, i) => ({
            email: `user${i + 1}@test.com`,
            nom: `Commercial ${i + 1}`,
            nbVentes: Math.floor(Math.random() * 10) + 1,
            totalCA: Math.floor(Math.random() * 50000) + 10000,
          }));
        }

        const sorted = data.sort((a, b) => b.totalCA - a.totalCA);
        setTopVendeurs(sorted);
        setLoading(false);
      },
      (error) => {
        console.error('[Performance] Firestore error', error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const podiumHeights = [160, 120, 100];

  return (
    <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: 28, marginBottom: 20, color: '#111827' }}>
        🏆 Classement des commerciaux
      </h2>

      {loading && <p>Chargement...</p>}
      {!loading && topVendeurs.length === 0 && (
        <p>Aucune donnée disponible pour ce mois.</p>
      )}

      {!loading && topVendeurs.length > 0 && (
        <>
          {/* Podium dynamique */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
              gap: 40,
              flexWrap: 'wrap',
              marginTop: 40,
            }}
          >
            {topVendeurs.slice(0, 3).map((v, index) => {
              const place = index + 1;
              const bgColor = podiumColors[index] || '#e5e7eb';
              const height = podiumHeights[index] || 80;
              const isUser = user && v.email === user.email;

              return (
                <motion.div
                  key={v.email}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                  style={{ textAlign: 'center', minWidth: 100 }}
                >
                  <div
                    style={{
                      background: bgColor,
                      height,
                      width: 100,
                      borderRadius: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: 18,
                      color: '#111827',
                      marginBottom: 8,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: isUser ? '3px solid #10b981' : 'none',
                    }}
                  >
                    🏅 {place}ᵉ
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
                    {v.totalCA.toLocaleString('fr-FR')} €
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {v.nbVentes} ventes
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Graphique complet */}
          <div
            style={{
              background: '#fff',
              marginTop: 60,
              padding: 20,
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            }}
          >
            <h3 style={{ marginBottom: 16 }}>📊 Classement complet</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topVendeurs.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalCA" fill="#3b82f6">
                  <LabelList
                    dataKey="totalCA"
                    position="top"
                    formatter={(v) => `${v} €`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
