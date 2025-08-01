// ✅ Stats.jsx complet et correct
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../firebaseConfig';

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#AA336A',
  '#663399',
];

function Stats() {
  const [parrainages, setParrainages] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'parrainages'),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => doc.data());
        setParrainages(data);
      }
    );

    return () => unsubscribe();
  }, []);

  // ✅ Générer données pour BarChart
  const statusCount = {};
  parrainages.forEach((p) => {
    statusCount[p.statut] = (statusCount[p.statut] || 0) + 1;
  });
  const statusData = Object.keys(statusCount).map((key) => ({
    name: key,
    value: statusCount[key],
  }));

  // ✅ Générer données pour PieChart
  const cityCount = {};
  parrainages.forEach((p) => {
    if (p.ville) {
      cityCount[p.ville] = (cityCount[p.ville] || 0) + 1;
    }
  });
  const cityData = Object.keys(cityCount).map((key) => ({
    name: key,
    value: cityCount[key],
  }));

  return (
    <div>
      <h3>📊 Statistiques</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
        <div style={{ flex: '1 1 400px', height: '400px' }}>
          <h5>Parrainages par Statut</h5>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: '1 1 400px', height: '400px' }}>
          <h5>Répartition par Ville</h5>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {cityData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ✅ Export par défaut pour que le Router le détecte correctement
export default Stats;
