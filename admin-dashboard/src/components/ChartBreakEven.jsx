import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function ChartBreakEven({ rentabilite, prixCentrale, prime }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!rentabilite || rentabilite.length === 0 || !prixCentrale) return;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx._chartInstance) ctx._chartInstance.destroy();

    // Calcul du cumul des économies + revente chaque année
    let cumul = -Number(prixCentrale);
    const cumulArray = rentabilite.map((row, i) => {
      // Ajoute la prime à la deuxième année
      if (i === 1 && prime) {
        cumul += Number(prime);
      }
      // Utilise diffPlusRevente si dispo, sinon diff + reventeEstimee
      let val = row['diffPlusRevente'];
      if (val === undefined) {
        val = (Number(row['diff']) || 0) + (Number(row['reventeEstimee']) || 0);
      }
      if (typeof val === 'string') {
        val = val.replace(/[^\d.-]/g, '');
      }
      const economie = Number(val) || 0;
      cumul += economie;
      return cumul;
    });

    // Trouver l'année de break even (première année où le cumul devient positif)
    const breakEvenIndex = cumulArray.findIndex((v) => v > 0);
    const breakEvenAnnee =
      breakEvenIndex !== -1 ? rentabilite[breakEvenIndex].annee : null;

    ctx._chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rentabilite.map((row) => row.annee),
        datasets: [
          {
            label: 'Cumul net (ROI)',
            data: cumulArray,
            borderColor: '#e11d48',
            backgroundColor: 'rgba(225,29,72,0.12)',
            fill: true,
            pointRadius: 3,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: function (context) {
                return 'Cumul net: ' + context.parsed.y.toLocaleString() + ' €';
              },
            },
          },
          annotation:
            breakEvenIndex !== -1
              ? {
                  annotations: {
                    breakEven: {
                      type: 'point',
                      xValue: rentabilite[breakEvenIndex].annee,
                      yValue: cumulArray[breakEvenIndex],
                      backgroundColor: '#e11d48',
                      radius: 7,
                      label: {
                        content: `Break even: ${breakEvenAnnee} (${
                          breakEvenIndex + 1
                        } ans)`,
                        enabled: true,
                        position: 'center',
                        color: '#fff',
                        font: { weight: 'bold' },
                      },
                    },
                  },
                }
              : {},
        },
        scales: {
          y: {
            title: { display: true, text: 'Cumul net (€)' },
            beginAtZero: false,
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
  }, [rentabilite, prixCentrale]);

  return (
    <div style={{ width: '100%', height: 220, marginTop: 32 }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: 220 }} />
    </div>
  );
}
