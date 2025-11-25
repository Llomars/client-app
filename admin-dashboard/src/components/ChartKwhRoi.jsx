import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function ChartKwhRoi({
  rentabilite,
  prixCentrale,
  prodMoyenneKwh,
}) {
  // DEBUG: Affichage temporaire des valeurs utilisées pour le calcul
  const canvasRef = useRef(null);

  // Calcul sur 20 ans
  const duree = 20;
  // Utilise prodMoyenneKwh * 20 comme production totale estimée sur 20 ans
  let coutTotalCentrale = 0;
  if (rentabilite && rentabilite.length > 0) {
    for (let i = 0; i < duree; i++) {
      const row = rentabilite[i];
      if (!row) continue;
      // On suppose que mensualiteCentrale est une mensualité mensuelle, donc on multiplie par 12 pour avoir l'annuel
      if (row.mensualiteCentrale && Number(row.mensualiteCentrale) > 0) {
        coutTotalCentrale += Number(row.mensualiteCentrale) * 12;
      }
    }
  }
  let prixKwhCentraleMoyen = null;
  if (prodMoyenneKwh && coutTotalCentrale > 0) {
    prixKwhCentraleMoyen = (coutTotalCentrale / (prodMoyenneKwh * 20)).toFixed(
      3
    );
  }
  let prixEdfBase =
    rentabilite && rentabilite[0]
      ? Number(rentabilite[0].prixEdfCts) / 100
      : 0.25;
  let prixKwhEdfInflation = [];
  let sumEdf = 0;
  for (let i = 0; i < duree; i++) {
    let prixEdfAnnee = prixEdfBase * Math.pow(1.05, i);
    prixKwhEdfInflation.push(prixEdfAnnee);
    sumEdf += prixEdfAnnee;
  }
  const prixKwhEdfMoyen = sumEdf / duree;
  const prixKwhEdf = prixKwhEdfInflation;

  useEffect(() => {
    if (!rentabilite || rentabilite.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx._chartInstance) {
      ctx._chartInstance.destroy();
    }
    ctx._chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rentabilite.map((row) => row.annee),
        datasets: [
          {
            label: 'Prix kWh EDF',
            data: prixKwhEdf,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.15)',
            fill: false,
            tension: 0.2,
            pointRadius: 3,
          },
          {
            label: 'Prix kWh Centrale (moyen 20 ans)',
            data: Array(rentabilite.length).fill(
              Number(prixKwhCentraleMoyen) || 0
            ),
            borderColor: '#16a34a',
            backgroundColor: 'rgba(16,163,74,0.15)',
            fill: false,
            borderDash: [6, 4],
            pointRadius: 3,
          },
          {
            label: 'Différence (EDF - Centrale)',
            data: prixKwhEdf.map((v) =>
              prixKwhCentraleMoyen !== null
                ? (v - prixKwhCentraleMoyen).toFixed(3)
                : null
            ),
            borderColor: '#f59e42',
            backgroundColor: 'rgba(245,158,66,0.15)',
            fill: false,
            borderDash: [2, 2],
            pointRadius: 2,
          },
        ].filter(Boolean),
      },
      options: {
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label + ': ' + context.parsed.y + ' €/kWh'
                );
              },
            },
          },
          annotation: {
            annotations: {
              moyenneCentrale:
                prixKwhCentraleMoyen !== null
                  ? {
                      type: 'line',
                      yMin: prixKwhCentraleMoyen,
                      yMax: prixKwhCentraleMoyen,
                      borderColor: '#16a34a',
                      borderWidth: 2,
                      label: {
                        content: `Prix moyen kWh Centrale 20 ans: ${prixKwhCentraleMoyen} €/kWh`,
                        enabled: true,
                        position: 'start',
                        color: '#16a34a',
                        font: { weight: 'bold' },
                      },
                    }
                  : {},
              moyenneEdf: {
                type: 'line',
                yMin: prixKwhEdfMoyen,
                yMax: prixKwhEdfMoyen,
                borderColor: '#6366f1',
                borderWidth: 2,
                label: {
                  content: `Moyenne EDF 20 ans: ${prixKwhEdfMoyen.toFixed(
                    3
                  )} €/kWh`,
                  enabled: true,
                  position: 'end',
                  color: '#6366f1',
                  font: { weight: 'bold' },
                },
              },
            },
          },
        },
        scales: {
          y: {
            title: { display: true, text: 'Prix du kWh (€)' },
            beginAtZero: true,
          },
          x: {
            title: { display: true, text: 'Année' },
          },
        },
        responsive: true,
        maintainAspectRatio: false,
      },
    });
    // Cleanup
    return () => {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
    };
  }, [rentabilite, prixCentrale, prodMoyenneKwh]);
  // Années
  const labels = rentabilite.map((row) => row.annee);
  // Différence annuelle
  const diffKwh = prixKwhEdf.map((v, i) =>
    prixKwhCentraleMoyen !== null ? (v - prixKwhCentraleMoyen).toFixed(3) : null
  );
  // Trouver l'année de rentabilité (première année où diff > 0)
  let roiIndex = diffKwh.findIndex((v) => v <= 0);
  if (roiIndex === -1) roiIndex = null;

  return (
    <div style={{ width: '100%', height: 340, marginTop: 32 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 340 }} />
      <div style={{ marginTop: 12, fontWeight: 'bold', color: '#16a34a' }}>
        Prix moyen du kWh Centrale sur 20 ans :{' '}
        {prixKwhCentraleMoyen !== null ? prixKwhCentraleMoyen : '-'} €/kWh
      </div>
      <div style={{ marginTop: 4, fontWeight: 'bold', color: '#6366f1' }}>
        Prix moyen du kWh EDF sur 20 ans (inflation 5%/an) :{' '}
        {prixKwhEdfMoyen ? prixKwhEdfMoyen.toFixed(3) : '-'} €/kWh
      </div>
      {prixKwhCentraleMoyen &&
      prixKwhEdfMoyen &&
      Number(prixKwhCentraleMoyen) > 0 ? (
        <div
          style={{
            marginTop: 8,
            marginBottom: 64,
            fontWeight: 'bold',
            color: '#0e7490',
          }}
        >
          Avec votre centrale, vous payez votre électricité{' '}
          {(prixKwhEdfMoyen / Number(prixKwhCentraleMoyen)).toFixed(1)} fois
          moins cher qu’avec EDF sur 20 ans.
        </div>
      ) : null}
    </div>
  );
}
