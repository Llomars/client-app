import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function ChartRentabiliteBar({ rentabilite }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!rentabilite || rentabilite.length === 0) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx._chartInstance) ctx._chartInstance.destroy();

    // Calcul du cumul des économies chaque année
    let cumul = 0;
    const cumulEconomies = rentabilite.map((row, i) => {
      // Économie annuelle = valeur de la colonne 'diffPlusRevente' (différence + revente estimée)
      let val = row['diffPlusRevente'];
      if (val === undefined) {
        // fallback : somme de diff + reventeEstimee si la colonne n'existe pas
        val = (Number(row['diff']) || 0) + (Number(row['reventeEstimee']) || 0);
      }
      if (typeof val === 'string') {
        val = val.replace(/[^\d.-]/g, '');
      }
      const economie = Number(val) || 0;
      cumul += economie;
      return cumul;
    });
    // Cumul total sur 20 ans
    const cumulTotal =
      cumulEconomies.length > 0 ? cumulEconomies[cumulEconomies.length - 1] : 0;

    // Trouver l'année de rentabilité (première année où le cumul devient positif)
    const retourIndex = cumulEconomies.findIndex((v) => v > 0);
    const retourAnnee =
      retourIndex !== -1 ? rentabilite[retourIndex].annee : null;

    ctx._chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: rentabilite.map((row) => row.annee),
        datasets: [
          {
            label: 'Cumul économies vs EDF',
            data: cumulEconomies,
            backgroundColor: rentabilite.map((row, i) =>
              i === retourIndex ? '#facc15' : '#2563eb'
            ),
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  'Cumul économies: ' + context.parsed.y.toLocaleString() + ' €'
                );
              },
            },
          },
          annotation:
            retourIndex !== -1
              ? {
                  annotations: {
                    retour: {
                      type: 'line',
                      xMin: retourIndex,
                      xMax: retourIndex,
                      borderColor: '#facc15',
                      borderWidth: 2,
                      label: {
                        content: `Retour: ${retourAnnee} (${
                          retourIndex + 1
                        } ans)`,
                        enabled: true,
                        position: 'center',
                        color: '#facc15',
                        font: { weight: 'bold' },
                      },
                    },
                  },
                }
              : {},
        },
        scales: {
          y: {
            title: { display: true, text: 'Cumul économies (€)' },
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
    return () => {
      if (ctx._chartInstance) ctx._chartInstance.destroy();
    };
  }, [rentabilite]);

  return (
    <div style={{ width: '100%', height: 220, marginTop: 32 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 220 }} />
    </div>
  );
}
