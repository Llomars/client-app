import axios from 'axios';
import Chart from 'chart.js/auto';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvent } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';

// db est importé depuis firebaseConfig.js (déjà initialisé)

function Calculateur() {
  // --- Firestore config primes/rachat ---
  const PARAMS_DOC_ID = 'calculateur_params';
  const [loadingParams, setLoadingParams] = useState(true);
  // ...existing code...
  // Champs admin pour prime et tarif de rachat
  // Champs admin pour prime par puissance
  const [prime3Admin, setPrime3Admin] = useState(null);
  const [prime6Admin, setPrime6Admin] = useState(null);
  const [prime9Admin, setPrime9Admin] = useState(null);
  const [tarifRachatAdmin, setTarifRachatAdmin] = useState(null);

  // Charge les paramètres Firestore au démarrage
  useEffect(() => {
    async function fetchParams() {
      setLoadingParams(true);
      try {
        const ref = doc(db, 'config', PARAMS_DOC_ID);
        const snap = await import('firebase/firestore').then(({ getDoc }) =>
          getDoc(ref)
        );
        if (snap.exists()) {
          const data = snap.data();
          setPrime3Admin(data.prime3 ?? null);
          setPrime6Admin(data.prime6 ?? null);
          setPrime9Admin(data.prime9 ?? null);
          setTarifRachatAdmin(data.tarifRachat ?? null);
        }
      } catch (e) {}
      setLoadingParams(false);
    }
    fetchParams();
  }, []);

  // Sauvegarde les paramètres Firestore (admin)
  const saveParams = async () => {
    try {
      const ref = doc(db, 'config', PARAMS_DOC_ID);
      await import('firebase/firestore').then(({ setDoc }) =>
        setDoc(ref, {
          prime3: prime3Admin,
          prime6: prime6Admin,
          prime9: prime9Admin,
          tarifRachat: tarifRachatAdmin,
        })
      );
      alert('Paramètres enregistrés !');
    } catch (e) {
      alert('Erreur enregistrement Firestore');
    }
  };
  // Permet de forcer le refresh de la simulation
  const [refreshKey, setRefreshKey] = useState(0);
  // ...existing hooks...
  // Paiement comptant
  const [paiementComptant, setPaiementComptant] = useState(false);
  // Option réinjection prime dans le financement
  const [reinjectPrime, setReinjectPrime] = useState(true);
  // Champs séparés pour pertes
  const [pvLoss, setPvLoss] = useState(3); // Pertes PV (%)
  const [cableLoss, setCableLoss] = useState(2); // Pertes câbles (%)
  const [inverterLoss, setInverterLoss] = useState(9); // Pertes onduleur (%)
  // --- Chargement images pour PDF (logo, pétales, backend) ---
  useEffect(() => {
    if (!window.petalesPngDataUrl) {
      fetch('/Pétales.png')
        .then((res) => {
          if (!res.ok) throw new Error('Image pétales non trouvée');
          return res.blob();
        })
        .then((blob) => {
          const reader = new window.FileReader();
          reader.onloadend = () => {
            window.petalesPngDataUrl = reader.result;
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          window.petalesPngDataUrl = null;
        });
    }
  }, []);
  useEffect(() => {
    if (!window.backendPngDataUrl) {
      fetch('/Backend2.png')
        .then((res) => {
          if (!res.ok) throw new Error('Image backend non trouvée');
          return res.blob();
        })
        .then((blob) => {
          const reader = new window.FileReader();
          reader.onloadend = () => {
            window.backendPngDataUrl = reader.result;
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          window.backendPngDataUrl = null;
        });
    }
  }, []);

  // --- Génération PDF quali ---
  const handleGeneratePDF = async (
    previewOnly = false,
    includeDevis = includeDevisInPreview
  ) => {
    setPdfLoading(true);
    try {
      const docPdf = new jsPDF();
      // --- Ajout logo société en base64 (DataURL) ---
      const getBase64FromUrl = async (url) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Logo non trouvé');
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new window.FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      };
      let logoDataUrl = null;
      let logoWidth = 70; // Agrandi
      let logoHeight = 40;
      let logoX = 10;
      let logoY = 10;
      logoDataUrl = await getBase64FromUrl('/logopdf.png');
      if (logoDataUrl) {
        docPdf.addImage(
          logoDataUrl,
          'PNG',
          logoX,
          logoY,
          logoWidth,
          logoHeight
        );
      }
      // Image pétales en bas à droite
      // ... tous les éléments de la page ...
      // Ajout pétales au premier plan en bas à droite
      if (window.petalesPngDataUrl) {
        docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
      }
      const yStart = logoY + logoHeight + 8;
      docPdf.setFillColor(255, 214, 224, 0.85);
      docPdf.rect(0, yStart, 210, 14, 'F');
      docPdf.setDrawColor(255, 214, 224);
      docPdf.setLineWidth(1.2);
      docPdf.rect(0, yStart, 210, 14);
      docPdf.setLineWidth(0.2);
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(20);
      docPdf.setFont('helvetica', 'bold');
      const title = 'Récapitulatif de votre projet photovoltaïque';
      const titleWidth = docPdf.getTextWidth(title);
      docPdf.text(title, (210 - titleWidth) / 2, yStart + 10);
      docPdf.setTextColor(0, 0, 0);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(12);
      let y = yStart + 20;
      if (!kit || !conso || !prodMoyenneKwh) {
        docPdf.setTextColor(220, 38, 38);
        docPdf.text('Aucune donnée de simulation disponible.', 20, y);
      } else {
        // Bloc résumé (2 colonnes)
        const blockHeight = 36;
        const blockY = y;
        const colWidth = 90;
        // Colonne 1 : Votre projet
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(10, blockY, colWidth, blockHeight, 5, 5, 'F');
        docPdf.setDrawColor(0, 0, 0);
        docPdf.roundedRect(10, blockY, colWidth, blockHeight, 5, 5);
        // Colonne 2 : Financement
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(
          10 + colWidth + 10,
          blockY,
          colWidth,
          blockHeight,
          5,
          5,
          'F'
        );
        docPdf.setDrawColor(0, 0, 0);
        docPdf.roundedRect(
          10 + colWidth + 10,
          blockY,
          colWidth,
          blockHeight,
          5,
          5
        );
        // Titres colonnes
        docPdf.setFontSize(13);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Votre projet', 13, blockY + 8);
        docPdf.text('Financement', 10 + colWidth + 13, blockY + 8);
        // Données projet
        docPdf.setFontSize(11);
        docPdf.setTextColor(30, 64, 175);
        let projX = 13,
          projValX = 32,
          projY = blockY + 15,
          projStep = 7;
        docPdf.text(`Kit :`, projX, projY);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${kit}`, projValX, projY);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Conso :`, projX, projY + projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${conso} kWh/an`, projValX, projY + projStep);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Production estimée :`, projX, projY + 2 * projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(
          `${prodMoyenneKwh} kWh/an`,
          projValX + 18,
          projY + 2 * projStep
        );
        docPdf.setFont('helvetica', 'normal');
        // Données financement
        docPdf.setTextColor(30, 64, 175);
        let finX = 10 + colWidth + 13,
          finValX = 10 + colWidth + 38,
          finY = blockY + 15;
        docPdf.text(`Banque :`, finX, finY);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${banque}`, finValX, finY);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Taux :`, finX, finY + projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${taux}%`, finValX, finY + projStep);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Durée :`, finX, finY + 2 * projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${mois} mois`, finValX, finY + 2 * projStep);
        docPdf.setFont('helvetica', 'normal');
        // Adresse
        let synthY = blockY + blockHeight + 8;
        docPdf.setFontSize(11);
        docPdf.setTextColor(245, 158, 11);
        docPdf.text('Adresse :', 13, synthY);
        docPdf.setTextColor(0, 0, 0);
        docPdf.setFont('helvetica', 'bold');
        const fullAddress = `${streetNumber ? streetNumber + ' ' : ''}${
          street ? street + ', ' : ''
        }${city ? city + ', ' : ''}${country ? country : ''}`;
        docPdf.text(fullAddress.trim() ? fullAddress : '-', 32, synthY, {
          maxWidth: 160,
        });
        docPdf.setFont('helvetica', 'normal');
        synthY += 8;
        // Synthèse (juste sous l'adresse)
        const cumulRevente = rentabilite.reduce(
          (acc, row) => acc + (row.reventeEstimee || 0),
          0
        );
        const totalEdfSynth = rentabilite.reduce(
          (acc, row) => acc + (row.coutEdf || 0),
          0
        );
        const synthHeight = 277 - synthY;
        if (
          typeof synthY === 'number' &&
          !isNaN(synthY) &&
          typeof synthHeight === 'number' &&
          !isNaN(synthHeight)
        ) {
          if (window.backendPngDataUrl) {
            docPdf.setDrawColor(0, 0, 0);
            docPdf.setLineWidth(4);
            docPdf.rect(10, synthY, 190, synthHeight, 'S');
            docPdf.rect(10, synthY, 190, synthHeight);
            docPdf.addImage(
              window.backendPngDataUrl,
              'PNG',
              10,
              synthY,
              190,
              synthHeight
            );
            docPdf.setLineWidth(0.2);
          } else {
            docPdf.setFillColor(255, 255, 255);
            docPdf.rect(10, synthY, 190, synthHeight, 'F');
          }
          // Ajout pétales au premier plan en bas à droite (après tous les autres éléments)
          if (window.petalesPngDataUrl) {
            docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
          }
        } else {
          docPdf.setFillColor(255, 255, 255);
          docPdf.rect(10, 40, 190, 100, 'F');
        }
        docPdf.setFontSize(18);
        docPdf.setTextColor(255, 255, 255);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text('SYNTHÈSE', 18, synthY + 20);
        docPdf.setDrawColor(80, 80, 80);
        docPdf.setLineWidth(0.5);
        docPdf.line(18, synthY + 24, 190, synthY + 24);
        // Blocs valeurs stylés (2x2)
        const blockW = 78,
          blockH = 24,
          blockR = 9;
        const blockGap = 10;
        const col1X = 22,
          col2X = col1X + blockW + blockGap;
        let rowY = synthY + 34,
          rowGap = blockH + blockGap;
        // Prime
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR, 'F');
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Prime', col1X + blockW / 2, rowY + 10, {
          align: 'center',
        });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        docPdf.text(`${prime} €`, col1X + blockW / 2, rowY + 16, {
          align: 'center',
        });
        // Cumul revente EDF
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR, 'F');
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(191, 161, 0);
        docPdf.text(
          "Revente estimée à l'année",
          col2X + blockW / 2,
          rowY + 10,
          {
            align: 'center',
          }
        );
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        // Affiche la valeur saisie manuellement
        docPdf.text(
          gainRevente !== '' ? `${Number(gainRevente).toFixed(2)} €` : '- €',
          col2X + blockW / 2,
          rowY + 16,
          {
            align: 'center',
          }
        );
        // Économie totale
        rowY += rowGap;
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR, 'F');
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(16, 185, 129);
        docPdf.text('Économie totale', col1X + blockW / 2, rowY + 10, {
          align: 'center',
        });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        docPdf.setTextColor(16, 185, 129);
        docPdf.text(
          `${totalDiff ? totalDiff + ' €' : '-'}`,
          col1X + blockW / 2,
          rowY + 16,
          { align: 'center' }
        );
        // Cumul location EDF
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(220, 38, 38);
        docPdf.text('Cumul location EDF', col2X + blockW / 2, rowY + 10, {
          align: 'center',
        });
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR, 'F');
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(12);
        docPdf.text('Coût total EDF', col2X + blockW / 2, rowY + 13, {
          align: 'center',
        });
        docPdf.setFontSize(16);
        docPdf.text(`${totalEdfSynth} €`, col2X + blockW / 2, rowY + 22, {
          align: 'center',
        });
      }
      // PAGE 2 : Tableau de rentabilité complet (20 ans)
      docPdf.addPage();
      // Logo uniquement sur la première page (ne pas ajouter ici)
      if (window.petalesPngDataUrl) {
        docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
      }
      docPdf.setFontSize(13);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Tableau de rentabilité complet (20 ans)', 15, 20);
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 0, 0);
      const tableY2 = 28;
      docPdf.setFillColor(255, 255, 255);
      docPdf.rect(10, tableY2, 260, 7, 'F');
      docPdf.setDrawColor(0, 0, 0);
      docPdf.rect(10, tableY2, 260, 7);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Année', 12, tableY2 + 5);
      docPdf.text('Coût EDF', 28, tableY2 + 5);
      docPdf.text('Coût centrale', 52, tableY2 + 5);
      docPdf.text('Revente', 82, tableY2 + 5);
      docPdf.text('prodMoyenneKwh', 100, tableY2 + 5);
      docPdf.text('consoJour', 120, tableY2 + 5);
      docPdf.text('surplus', 140, tableY2 + 5);
      docPdf.text('prixRevente', 160, tableY2 + 5);
      docPdf.text('Éco.', 180, tableY2 + 5);
      docPdf.text('Mens. EDF', 200, tableY2 + 5);
      docPdf.text('Mens. centrale', 220, tableY2 + 5);
      let rowY2 = tableY2 + 7;
      for (let i = 0; i < rentabilite.length; i++) {
        const row = rentabilite[i];
        docPdf.setTextColor(0, 0, 0);
        docPdf.text(`${row.annee}`.slice(-2), 12, rowY2 + 5);
        docPdf.text(`${row.coutEdf} €`, 28, rowY2 + 5);
        docPdf.text(`${row.coutCentrale} €`, 52, rowY2 + 5);
        docPdf.setTextColor(191, 161, 0);
        docPdf.text(`${row.reventeEstimee} €`, 82, rowY2 + 5);
        docPdf.setTextColor(0, 0, 0);
        docPdf.text(`${prodMoyenneKwh}`, 100, rowY2 + 5);
        docPdf.text(`${consoJour}`, 120, rowY2 + 5);
        docPdf.text(
          `${
            prodMoyenneKwh && consoJour
              ? (prodMoyenneKwh - consoJour).toFixed(2)
              : 0
          }`,
          140,
          rowY2 + 5
        );
        docPdf.text(
          `${kit && kit.startsWith('12KWh') ? '0,0894' : '0,1741'}`,
          160,
          rowY2 + 5
        );
        docPdf.setTextColor(16, 185, 129);
        docPdf.text(`${row.diff} €`, 180, rowY2 + 5);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text(`${row.mensualiteEdf} €`, 200, rowY2 + 5);
        docPdf.text(`${row.mensualiteCentrale} €`, 220, rowY2 + 5);
        rowY2 += 7;
      }
      // Totaux
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(202, 138, 4);
      rowY2 += 20;
      const totalRevente = rentabilite.reduce(
        (acc, row) => acc + (row.reventeEstimee || 0),
        0
      );
      const totalEdf = rentabilite.reduce(
        (acc, row) => acc + (row.coutEdf || 0),
        0
      );
      const totalDiff = rentabilite.reduce(
        (acc, row) => acc + (row.diff || 0),
        0
      );
      // Nouvelle ligne : Cumul revente sur 20 ans
      docPdf.setTextColor(191, 161, 0);
      docPdf.text('Cumul revente (20 ans)', 82, rowY2 + 5);
      docPdf.text(`${totalRevente.toFixed(2)} €`, 110, rowY2 + 5);
      // Nouvelle ligne : Total économies + revente (en bas à droite)
      const totalEcosRevente = totalDiff + totalRevente;
      docPdf.setTextColor(16, 185, 129);
      docPdf.text('Total économies + revente', 150, rowY2 + 5);
      docPdf.text(`${totalEcosRevente.toFixed(2)} €`, 200, rowY2 + 5);
      // Message rassurant
      let msgY = rowY2 + 18;
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(12);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text(
        'Votre projet solaire est étudié pour maximiser vos économies et votre autonomie.',
        15,
        msgY
      );
      docPdf.setTextColor(99, 102, 241);
      docPdf.text(
        'Nos équipes restent à votre écoute pour toute question ou adaptation de votre projet.',
        15,
        msgY + 6
      );

      // PAGE 3 : Conseils, Contact, Graphique
      docPdf.addPage();
      // Ajout pétales sur la troisième page
      if (window.petalesPngDataUrl) {
        docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
      }
      docPdf.setFillColor(255, 214, 224, 0.85);
      docPdf.rect(0, 10, 210, 16, 'F');
      docPdf.setDrawColor(255, 214, 224);
      docPdf.setLineWidth(1.2);
      docPdf.rect(0, 10, 210, 16);
      docPdf.setLineWidth(0.2);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(20);
      docPdf.setTextColor(255, 255, 255);
      const titre3 = 'Conseils, Astuces & Contact';
      const titre3Width = docPdf.getTextWidth(titre3);
      docPdf.text(titre3, (210 - titre3Width) / 2, 22);
      // --- Graphique comparatif Coût EDF vs Coût centrale par année (en bas de page) ---
      // Calcul de la position Y pour placer le graphique sous les blocs conseils/contact/QR
      const conseilsY = 30;
      const conseilsH = 58;
      const contactYGraph = conseilsY + conseilsH + 12;
      const contactH = 54;
      const graphY = contactYGraph + contactH + 16; // 16px de marge sous le bloc contact
      try {
        const chartCanvas = document.createElement('canvas');
        chartCanvas.width = 440;
        chartCanvas.height = 180;
        const ctx = chartCanvas.getContext('2d');
        if (window._pdfChartInstance) window._pdfChartInstance.destroy();
        window._pdfChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: rentabilite.map((r) => r.annee),
            datasets: [
              {
                label: 'Coût EDF',
                data: rentabilite.map((r) => r.coutEdf),
                backgroundColor: 'rgba(99,102,241,0.85)', // bleu
                borderColor: '#3730a3',
                borderWidth: 2,
                borderRadius: 4,
                barPercentage: 1,
                categoryPercentage: 1,
              },
              {
                label: 'Coût centrale',
                data: rentabilite.map((r) => r.coutCentrale),
                backgroundColor: 'rgba(16,185,129,0.85)', // vert
                borderColor: '#059669',
                borderWidth: 2,
                borderRadius: 4,
                barPercentage: 1,
                categoryPercentage: 1,
              },
            ],
          },
          options: {
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {
                  font: { size: 13, weight: 'bold' },
                  color: '#222',
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return (
                      context.dataset.label + ': ' + context.parsed.y + ' €'
                    );
                  },
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#222', font: { size: 10 } },
              },
              y: {
                beginAtZero: true,
                ticks: {
                  color: '#222',
                  font: { size: 10 },
                  callback: (v) => v + ' €',
                },
              },
            },
            animation: false,
            responsive: false,
            maintainAspectRatio: false,
          },
        });
        await new Promise((resolve) => setTimeout(resolve, 400));
        const chartImg = chartCanvas.toDataURL('image/png');
        // Positionne le graphique en bas de la page 3
        docPdf.addImage(chartImg, 'PNG', 10, graphY, 190, 65);
      } catch (e) {}
      // Bloc Conseils & Astuces
      docPdf.setFillColor(255, 255, 255); // fond blanc
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(1.1);
      docPdf.roundedRect(12, 30, 185, 58, 10, 10, 'F');
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(1.1);
      docPdf.roundedRect(12, 30, 185, 58, 10, 10);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(15);
      docPdf.setTextColor(0, 0, 0); // texte noir
      docPdf.text('Conseils & Astuces', 20, 44);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(12);
      docPdf.setTextColor(0, 0, 0); // texte noir
      const conseils = [
        "• Surveillez votre production via l'application dédiée.",
        '• Nettoyez les panneaux 1-2x/an pour optimiser le rendement.',
        "• Privilégiez l'autoconsommation en journée.",
        '• Pensez à adapter vos usages (lave-linge, chauffe-eau) aux heures solaires.',
        '• Contactez-nous pour toute question technique ou administrative.',
      ];
      let conseilY = 54;
      conseils.forEach((c) => {
        docPdf.text(c, 22, conseilY);
        conseilY += 6;
      });
      // Bloc Contact Botaik
      const contactY = 30 + 58 + 12;
      docPdf.setFillColor(255, 255, 255); // fond blanc
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(1.1);
      docPdf.roundedRect(12, contactY, 185, 54, 10, 10, 'F');
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(1.1);
      docPdf.roundedRect(12, contactY, 185, 54, 10, 10);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(15);
      docPdf.setTextColor(0, 0, 0); // texte noir
      docPdf.text('Contact Botaik', 20, contactY + 16);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(12);
      docPdf.setTextColor(0, 0, 0); // texte noir
      docPdf.text('Site : www.Botaik.re', 20, contactY + 26);
      docPdf.text('Mail : contact@botaik.re', 20, contactY + 32);
      docPdf.text('Tel : 0262 00 00 00', 20, contactY + 38);
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 0, 0); // texte noir
      docPdf.text(
        'Suivi, conseils, SAV : notre équipe vous accompagne !',
        20,
        contactY + 48,
        { maxWidth: 170 }
      );
      // QR code du site internet
      try {
        const qrUrl =
          'https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=https://botaik.re';
        const qrResp = await fetch(qrUrl);
        const qrBlob = await qrResp.blob();
        const qrReader = new window.FileReader();
        const qrPromise = new Promise((resolve) => {
          qrReader.onloadend = () => resolve(qrReader.result);
        });
        qrReader.readAsDataURL(qrBlob);
        const qrDataUrl = await qrPromise;
        docPdf.addImage(qrDataUrl, 'PNG', 170, contactY + 10, 22, 22);
      } catch (e) {}
      // --- Fin page 3 ---
      // --- Fin page 3 ---
      // --- PAGE 4 : Devis personnalisé ---
      if (includeDevis) {
        docPdf.addPage();
        // --- En-tête ---
        // Ajout pétales sur la quatrième page
        if (window.petalesPngDataUrl) {
          docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
        }
        if (window.logoPngDataUrl) {
          docPdf.addImage(window.logoPngDataUrl, 'PNG', 15, 10, 40, 18);
        }
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(20);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Devis personnalisé', 60, 25);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(12);
        docPdf.setTextColor(99, 102, 241);
        docPdf.text('Date : ' + new Date().toLocaleDateString(), 150, 25);

        // --- Bloc infos client/conseiller ---
        docPdf.setFillColor(255, 255, 255);
        docPdf.roundedRect(15, 35, 180, 36, 6, 6, 'F');
        docPdf.setDrawColor(0, 0, 0);
        docPdf.roundedRect(15, 35, 180, 36, 6, 6);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Nom :', 20, 46);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setTextColor(0, 0, 0);
        docPdf.text(
          selectedClient && selectedClient.nom ? selectedClient.nom : '-',
          45,
          46,
          { maxWidth: 60 }
        );
        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Prénom :', 110, 46);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setTextColor(0, 0, 0);
        docPdf.text(
          selectedClient && selectedClient.prenom ? selectedClient.prenom : '-',
          145,
          46,
          { maxWidth: 50 }
        );
        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Adresse mail :', 20, 54);
        docPdf.setFont('helvetica', 'normal');
      }
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(
        selectedClient && selectedClient.email ? selectedClient.email : '-',
        65,
        54,
        { maxWidth: 90 }
      );
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Numéro de tél :', 110, 54);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(
        selectedClient && selectedClient.tel ? selectedClient.tel : '-',
        155,
        54,
        { maxWidth: 40 }
      );
      docPdf.setFont('helvetica', 'bold');
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Conseiller :', 20, 66);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(user && user.displayName ? user.displayName : '-', 45, 66, {
        maxWidth: 60,
      });

      // --- Bloc projet supprimé (déjà présent en page 1) ---

      // --- Tableau financier ---
      let yTab = 80; // Décalé pour éviter chevauchement avec le cadre infos client/conseiller
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(14);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Détail financier', 15, yTab);
      yTab += 6;
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(12);
      docPdf.setTextColor(0, 0, 0);
      docPdf.setFillColor(255, 255, 255);
      docPdf.roundedRect(15, yTab, 180, 36, 6, 6, 'F');
      docPdf.setDrawColor(0, 0, 0);
      docPdf.roundedRect(15, yTab, 180, 36, 6, 6);
      let yRow = yTab + 10;
      docPdf.text('Prix centrale :', 20, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(prixCentrale ? prixCentrale + ' €' : '-', 65, yRow, {
        maxWidth: 40,
      });
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('Remise :', 110, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(remise ? remise + ' €' : '-', 155, yRow, { maxWidth: 40 });
      yRow += 8;
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('Montant financé :', 20, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(montantFinance ? montantFinance + ' €' : '-', 65, yRow, {
        maxWidth: 40,
      });
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('Banque :', 110, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(banque ? banque : '-', 155, yRow, { maxWidth: 40 });
      yRow += 8;
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('Apport :', 20, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(apport ? apport + ' €' : '-', 65, yRow, { maxWidth: 40 });
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('Durée :', 110, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(mois ? mois + ' mois' : '-', 155, yRow, { maxWidth: 40 });
      yRow += 8;
      docPdf.setFont('helvetica', 'normal');
      docPdf.text('Mensualité :', 20, yRow);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(mensualite ? mensualite + ' €' : '-', 65, yRow, {
        maxWidth: 40,
      });

      // --- Composition du kit ---
      let yKit = yRow + 12; // Remonté pour une meilleure disposition
      let kitBoxX = 18,
        kitBoxY = yKit,
        kitBoxW = 175,
        kitBoxH = 85;
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(1);
      docPdf.roundedRect(kitBoxX, kitBoxY, kitBoxW, kitBoxH, 8, 8); // Contour uniquement
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(13);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Composition du kit', kitBoxX + 6, kitBoxY + 10);
      // Récupère la composition du kit sélectionné
      const selectedKitObj = kits.find((k) => k.value === kit);
      const kitDetails =
        selectedKitObj && selectedKitObj.composition
          ? selectedKitObj.composition
          : [
              'Panneaux de 500W',
              'Batterie',
              'Onduleur',
              'Boitier BMS',
              'Système Monitoring',
              'Rails et visseries',
              'Clé wifi',
              'Câbles solaires',
              'Raccordement',
              'Déclaration Préalable des travaux',
              'Installation',
            ];
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(11);
      docPdf.setTextColor(0, 0, 0);
      let yKitDetails = kitBoxY + 18;
      kitDetails.forEach((item, idx) => {
        docPdf.text('• ' + item, kitBoxX + 8, yKitDetails + idx * 6, {
          maxWidth: kitBoxW - 16,
        });
        if (idx < kitDetails.length - 1) {
          // Ligne séparatrice
          docPdf.setDrawColor(220, 220, 220);
          docPdf.setLineWidth(0.5);
          docPdf.line(
            kitBoxX + 8,
            yKitDetails + idx * 6 + 2.5,
            kitBoxX + kitBoxW - 8,
            yKitDetails + idx * 6 + 2.5
          );
        }
      });
      // Prix centrale dans un petit cadre, aligné à droite sous le cadre du kit
      let priceBoxW = 70,
        priceBoxH = 16;
      let priceBoxX = kitBoxX + kitBoxW - priceBoxW;
      let priceBoxY = kitBoxY + kitBoxH; // Position intermédiaire, légèrement plus bas
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(0.8);
      docPdf.roundedRect(priceBoxX, priceBoxY, priceBoxW, priceBoxH, 5, 5); // Contour uniquement
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Prix à payer :', priceBoxX + 6, priceBoxY + 11);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.setTextColor(0, 0, 0);
      let prixAPayer =
        prixCentrale && remise ? prixCentrale - remise : prixCentrale;
      docPdf.text(
        prixAPayer ? prixAPayer + ' €' : '-',
        priceBoxX + priceBoxW - 6,
        priceBoxY + 11,
        { align: 'right' }
      );

      // --- Cadre signature client en bas à droite ---
      // --- Cadre signature client en bas à droite ---
      let signBoxY = 250;
      let signBoxW = 70,
        signBoxH = 25;
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(0.8);
      docPdf.roundedRect(135, signBoxY, signBoxW, signBoxH, 6, 6);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Signature client', 138, signBoxY + 8);
      // Mention sous le cadre signature client (à droite)
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(
        'écrire : date et lieu "Lu et approuvé, bon pour commande"',
        138,
        signBoxY + signBoxH + 6,
        { maxWidth: 65 }
      );

      // --- Cadre signature entreprise en bas à gauche ---
      // Mention sous le cadre signature entreprise (à gauche)
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 0, 0);
      docPdf.text(
        "Sous réserve d'accord technique, administrative et financière",
        18,
        signBoxY + signBoxH + 6,
        { maxWidth: 65 }
      );
      docPdf.setDrawColor(0, 0, 0);
      docPdf.setLineWidth(0.8);
      docPdf.roundedRect(15, signBoxY, signBoxW, signBoxH, 6, 6);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.setTextColor(30, 64, 175);
      docPdf.text('Signature entreprise', 18, signBoxY + 8);

      // --- PAGE 5 : Page de signature ---

      // --- Fin devis et signature pages ---
      if (previewOnly) {
        const pdfBlob = docPdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setPdfUrl(url);
        setShowPdfPreview(true);
        setPdfLoading(false);
      } else {
        docPdf.save('simulation-photovoltaique.pdf');
        setPdfLoading(false);
      }
    } catch (e) {
      setPdfLoading(false);
      alert('Erreur génération PDF : ' + e.message);
    }
  };
  // <-- Correction: fermeture de la fonction
  // --- Données statiques et variables calculées nécessaires aux hooks ---
  const currentYear = new Date().getFullYear();
  const banques = [
    { nom: 'BFC', taux: 6.99, dureeMax: 84 },
    { nom: 'Crédit Agricole', taux: 5.1, dureeMax: 144 },
    { nom: 'Sofider', taux: 7.1, dureeMax: 180 },
    { nom: 'CMOI', taux: 7.1, dureeMax: 180 },
    { nom: 'BNB', taux: 5.3, dureeMax: 108 },
    { nom: 'BNP', taux: 2.6, dureeMax: 180 },
    { nom: 'Bred', taux: 2.7, dureeMax: 160 },
    { nom: 'La banque postale', taux: 2.3, dureeMax: 140 },
  ];
  // Utilise la prime admin selon le kit
  const kits = [
    {
      label: '6 KWh 3',
      value: '6KWh-3',
      prix: 18000,
      prime: prime6Admin !== null ? prime6Admin : 5760,
      composition: [
        'Panneaux de 500W x 12',
        'Batterie de 15Kwh',
        'Onduleur de 6Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '9 KWh 3',
      value: '9KWh-3',
      prix: 26000,
      prime: prime9Admin !== null ? prime9Admin : 8640,
      composition: [
        'Panneaux de 500W x 18',
        'Batterie de 15Kwh',
        'Onduleur de 6Kwh',
        'Onduleur de 3Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '12 KWh 3',
      value: '12KWh-3',
      prix: 32000,
      prime: prime9Admin !== null ? prime9Admin : 6840,
      composition: [
        'Panneaux de 500W x 24',
        'Batterie de 15Kwh',
        'Onduleur de 6Kwh x 2',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    // Ajout des kits 18KWh
    {
      label: '18 KWh 0',
      value: '18KWh-0',
      prix: 34000,
      prime: null,
      composition: [
        'Panneaux de 500W x 36',
        'Onduleur de 6Kwh x 3',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '18 KWh 1',
      value: '18KWh-1',
      prix: 36000,
      prime: null,
      composition: [
        'Panneaux de 500W x 36',
        'Batterie de 5Kwh',
        'Onduleur de 6Kwh x 3',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '18 KWh 2',
      value: '18KWh-2',
      prix: 38000,
      prime: null,
      composition: [
        'Panneaux de 500W x 36',
        'Batterie de 10Kwh',
        'Onduleur de 6Kwh x 3',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '18 KWh 3',
      value: '18KWh-3',
      prix: 40000,
      prime: null,
      composition: [
        'Panneaux de 500W x 36',
        'Batterie de 15Kwh',
        'Onduleur de 6Kwh x 3',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '3 KWh 0',
      value: '3KWh-0',
      prix: 7500,
      prime: prime3Admin !== null ? prime3Admin : 4830,
      composition: [
        'Panneaux de 500W x 6',
        'Onduleur de 3Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '3 KWh 1',
      value: '3KWh-1',
      prix: 9500,
      prime: prime3Admin !== null ? prime3Admin : 4830,
      composition: [
        'Panneaux de 500W x 6',
        'Batterie de 5Kwh',
        'Onduleur de 3Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '6 KWh 0',
      value: '6KWh-0',
      prix: 12000,
      prime: prime6Admin !== null ? prime6Admin : 5760,
      composition: [
        'Panneaux de 500W x 12',
        'Onduleur de 6Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '6 KWh 1',
      value: '6KWh-1',
      prix: 15000,
      prime: prime6Admin !== null ? prime6Admin : 5760,
      composition: [
        'Panneaux de 500W x 12',
        'Batterie de 5Kwh',
        'Onduleur de 6Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '6 KWh 2',
      value: '6KWh-2',
      prix: 16000,
      prime: prime6Admin !== null ? prime6Admin : 5760,
      composition: [
        'Panneaux de 500W x 12',
        'Batterie de 10Kwh',
        'Onduleur de 6Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '9 KWh 0',
      value: '9KWh-0',
      prix: 16500,
      prime: prime9Admin !== null ? prime9Admin : 8640,
      composition: [
        'Panneaux de 500W x 18',
        'Onduleur de 6Kwh',
        'Onduleur de 3Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '9 KWh 1',
      value: '9KWh-1',
      prix: 22000,
      prime: prime9Admin !== null ? prime9Admin : 8640,
      composition: [
        'Panneaux de 500W x 18',
        'Batterie de 5Kwh',
        'Onduleur de 6Kwh',
        'Onduleur de 3Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '9 KWh 2',
      value: '9KWh-2',
      prix: 24000,
      prime: prime9Admin !== null ? prime9Admin : 8640,
      composition: [
        'Panneaux de 500W x 18',
        'Batterie de 10Kwh',
        'Onduleur de 6Kwh',
        'Onduleur de 3Kwh',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '12 KWh 0',
      value: '12KWh-0',
      prix: 22000,
      prime: prime9Admin !== null ? prime9Admin : 6840,
      composition: [
        'Panneaux de 500W x 24',
        'Onduleur de 6Kwh x 2',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
    {
      label: '12 KWh 2',
      value: '12KWh-2',
      prix: 30000,
      prime: prime9Admin !== null ? prime9Admin : 6840,
      composition: [
        'Panneaux de 500W x 24',
        'Batterie de 10KWh',
        'Onduleur de 6Kwh x 2',
        'Boitier BMS',
        'Système Monitoring',
        'Rails et visseries',
        'Clé wifi',
        'Câbles solaires',
        'Raccordement',
        'Déclaration Préalable des travaux',
        'Installation',
      ],
    },
  ];
  const orientationAzimut = {
    Sud: 0,
    'Sud-Est': -45,
    Est: -90,
    'Nord-Est': -135,
    Nord: 180,
    'Nord-Ouest': 135,
    Ouest: 90,
    'Sud-Ouest': 45,
  };

  // --- HOOKS AUTH ---
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  // --- TOUS LES AUTRES HOOKS (états/metiers) ---
  // (ne rien déplacer du contenu métier, tout reste ici)
  // Place all useState/useEffect hooks here, before any return or conditional
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [includeDevisInPreview, setIncludeDevisInPreview] = useState(true);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [apport, setApport] = useState(0);
  const [prodMoyenneKwh, setProdMoyenneKwh] = useState(0);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchClient, setSearchClient] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [assignStatus, setAssignStatus] = useState('');
  const [kit, setKit] = useState('');
  const [conso, setConso] = useState('');
  const [pourcentageJour, setPourcentageJour] = useState(50); // slider jour/nuit
  const [prixCentrale, setPrixCentrale] = useState(0);
  const [prixNet, setPrixNet] = useState(0);
  const [remise, setRemise] = useState(0);
  const [montantFinance, setMontantFinance] = useState(0);
  const [inclinaison, setInclinaison] = useState(20); // valeur par défaut
  const [orientation, setOrientation] = useState('Sud');
  const [country, setCountry] = useState('France');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [loadingAdresse, setLoadingAdresse] = useState(false);
  const [coords, setCoords] = useState({ lat: -21.1151, lng: 55.5364 }); // Centre Réunion
  // Géolocalisation navigateur
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setAdresseError('');
        },
        (error) => {
          setAdresseError("Impossible d'obtenir la localisation actuelle");
        }
      );
    } else {
      setAdresseError(
        "La géolocalisation n'est pas supportée par ce navigateur"
      );
    }
  };
  const [adresseError, setAdresseError] = useState('');
  const [banque, setBanque] = useState('BFC');
  const [taux, setTaux] = useState(6.99);
  const [dureeMax, setDureeMax] = useState(84);
  const [mois, setMois] = useState(84);
  const [prime, setPrime] = useState(0);
  const [gainRevente, setGainRevente] = useState(''); // valeur saisie manuellement
  const [eco, setEco] = useState(0);
  const [rentabilite, setRentabilite] = useState([]);
  const [modeAugmentation, setModeAugmentation] = useState(true); // true = avec augmentation, false = sans
  const [loadingPVGIS, setLoadingPVGIS] = useState(false);
  const [pvError, setPvError] = useState('');

  // Calcul conso jour/nuit
  const consoJour = conso ? (Number(conso) * pourcentageJour) / 100 : 0;
  const consoNuit = conso ? (Number(conso) * (100 - pourcentageJour)) / 100 : 0;

  // Calcul par jour
  const consoNuitJour = consoNuit / 365;
  // Capacité batterie du kit (si présente)
  const kitObj = kits.find((k) => k.value === kit);
  let capaciteBatterie = 0;
  if (kitObj) {
    if (kitObj.value.endsWith('KWh-2')) {
      capaciteBatterie = 10;
    } else if (kitObj.value.endsWith('KWh-1')) {
      capaciteBatterie = 5;
    } else if (kitObj.composition) {
      // fallback extraction
      const batMatch = kitObj.composition.find((c) =>
        c.toLowerCase().includes('batterie')
      );
      if (batMatch) {
        const match = batMatch.match(/(\d+)[kK][wW][hH]/);
        if (match) capaciteBatterie = Number(match[1]);
        else capaciteBatterie = 5;
      }
    }
  }
  // Résiduel EDF la nuit
  // Résiduel EDF annuel
  const residuelEDFAn =
    consoNuitJour > capaciteBatterie
      ? (consoNuitJour - capaciteBatterie) * 365
      : 0;
  const coutResiduelEDF = residuelEDFAn * 0.25;

  // --- Variables calculées pour le financement (utilisées dans les hooks) ---
  const montant = montantFinance;
  let tauxEffectif = taux;
  if (banque === 'BNB') {
    if (mois >= 96 && mois <= 108) tauxEffectif = 5.6;
    else if (mois >= 72 && mois < 96) tauxEffectif = 5.4;
    else tauxEffectif = 5.3;
  }
  const mensualite = (() => {
    const t = tauxEffectif / 100 / 12;
    const n = mois;
    if (t === 0) return n ? (montant / n).toFixed(2) : '0.00';
    return n ? ((montant * t) / (1 - Math.pow(1 + t, -n))).toFixed(2) : '0.00';
  })();

  // --- useEffects ---
  // Met à jour le marqueur sur la carte dès que l'adresse change
  useEffect(() => {
    // Construit l'adresse complète
    const fullAddress = `${streetNumber ? streetNumber + ' ' : ''}${
      street ? street + ', ' : ''
    }${city ? city + ', ' : ''}${country ? country : ''}`;
    if (fullAddress.trim().length > 5) {
      setLoadingAdresse(true);
      setAdresseError('');
      // Appel à Nominatim pour géocoder
      axios
        .get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            fullAddress
          )}`
        )
        .then((res) => {
          if (res.data && res.data.length > 0) {
            const { lat, lon } = res.data[0];
            setCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
            setAdresseError('');
          } else {
            setAdresseError('Adresse non trouvée');
          }
        })
        .catch(() => {
          setAdresseError('Erreur de géolocalisation');
        })
        .finally(() => {
          setLoadingAdresse(false);
        });
    }
  }, [country, city, street, streetNumber]);
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthChecked(true);
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        setRole(idTokenResult.claims.role || null);
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);
  // --- Access control: only allow certain roles ---
  useEffect(() => {
    if (authChecked && !user) {
      navigate('/');
    }
  }, [authChecked, user, navigate]);

  // Met à jour prix centrale, prix net, montant à financer, prime et gain revente (surplus, bon tarif) quand kit/remise change
  useEffect(() => {
    const kitObj = kits.find((k) => k.value === kit);
    if (kitObj) {
      setPrixCentrale(kitObj.prix);
      setPrixNet(kitObj.prix - remise);
      setMontantFinance(kitObj.prix - remise - apport);
      setPrime(kitObj.prime);
    } else {
      setPrixCentrale(0);
      setPrixNet(0);
      setMontantFinance(0);
      setPrime(0);
    }
    // Ne touche plus à gainRevente ici !
  }, [kit, remise, apport, prodMoyenneKwh, kits, conso, pourcentageJour]);

  // Calcul économies annuelles (exemple : prodMoyenneKwh * 0.18€/kWh)
  useEffect(() => {
    if (prodMoyenneKwh && conso) {
      setEco((prodMoyenneKwh * 0.18).toFixed(0));
    } else {
      setEco(0);
    }
  }, [prodMoyenneKwh, conso]);

  // Calcul du tableau de rentabilité sur 20 ans avec +5%/an sur le prix EDF
  useEffect(() => {
    if (!prodMoyenneKwh || !conso || !prixNet) {
      setRentabilite([]);
      return;
    }
    const prixEdfBase = 0.25; // €/kWh (tarif Réunion 2025, MAJ)
    let prixEdf = prixEdfBase;
    const rows = [];
    // Nouvelle logique : remboursement anticipé de la prime à partir de la 2e année
    let montantRestant = montantFinance;
    let moisRestant = mois;
    let tauxRestant = tauxEffectif;
    let mensualiteCourante = mensualite;
    let primeUtilisee = false;
    for (let i = 0; i < 20; i++) {
      const annee = currentYear + i;
      const coutEdf = (conso * prixEdf).toFixed(0);
      let coutCentrale = 0;
      // Mensualité EDF = coût EDF / 12
      const mensualiteEdf = ((conso * prixEdf) / 12).toFixed(2);
      // Mensualité centrale = mensualitéCourante si remboursement, sinon 0
      let mensualiteCentrale = 0;
      // Si encore en remboursement
      if (moisRestant > 0) {
        // À partir de la 2e année, on déduit la prime du solde restant (une seule fois)
        if (i === 1 && prime && !primeUtilisee && reinjectPrime) {
          montantRestant = Math.max(0, montantRestant - prime);
          // Recalcule la mensualité sur le solde restant et la durée restante
          const t = tauxRestant / 100 / 12;
          if (t === 0) {
            mensualiteCourante = moisRestant
              ? (montantRestant / moisRestant).toFixed(2)
              : '0.00';
          } else {
            mensualiteCourante = moisRestant
              ? (
                  (montantRestant * t) /
                  (1 - Math.pow(1 + t, -moisRestant))
                ).toFixed(2)
              : '0.00';
          }
          primeUtilisee = true;
        }
        // Coût centrale = mensualité courante * 12, mais si moins de 12 mois restants, on ajuste
        if (moisRestant >= 12) {
          coutCentrale = (mensualiteCourante * 12).toFixed(0);
          mensualiteCentrale = mensualiteCourante;
          moisRestant -= 12;
        } else {
          coutCentrale = (mensualiteCourante * moisRestant).toFixed(0);
          mensualiteCentrale = moisRestant > 0 ? mensualiteCourante : 0;
          moisRestant = 0;
        }
      }
      // Utilise la valeur saisie manuellement pour la revente
      rows.push({
        annee,
        coutEdf: Number(coutEdf),
        coutCentrale: Number(coutCentrale),
        prixEdfCts: (prixEdf * 100).toFixed(1),
        reventeEstimee:
          gainRevente !== '' ? Number(gainRevente) : 0,
        diff: Number(coutEdf) - Number(coutCentrale),
        mensualiteEdf,
        mensualiteCentrale,
      });
      prixEdf *= modeAugmentation ? 1.05 : 1.0;
    }
    setRentabilite(rows);
    // Champ de saisie pour la revente estimée par an (à placer dans le JSX principal)
    // <div style={{ margin: '16px 0' }}>
    //   <label htmlFor="reventeManuelle">Revente estimée par an (€) :</label>
    //   <input
    //     id="reventeManuelle"
    //     type="number"
    //     value={gainRevente}
    //     onChange={e => setGainRevente(e.target.value)}
    //     min="0"
    //     step="0.01"
    //     style={{ marginLeft: 8, width: 120 }}
    //   />
    // </div>
  }, [
    prodMoyenneKwh,
    conso,
    prixNet,
    mensualite,
    mois,
    montantFinance,
    tauxEffectif,
    prime,
    kit,
    modeAugmentation,
    reinjectPrime,
  ]);

  // Requête PVGIS à chaque changement de coords ou kit
  useEffect(() => {
    async function fetchPVGIS() {
      setLoadingPVGIS(true);
      setPvError('');
      if (!coords.lat || !coords.lng || !kit) {
        setProdMoyenneKwh(0);
        setLoadingPVGIS(false);
        return;
      }
      // Parse kit to get kW
      let kw = 0;
      const kitParts = kit.split(' ');
      if (kitParts.length > 0) {
        const puissanceStr = kitParts[0].replace('KWh', '');
        kw = parseInt(puissanceStr, 10);
      }
      if (!kw) {
        setProdMoyenneKwh(0);
        setPvError('Sélectionnez un kit pour estimer la production.');
        setLoadingPVGIS(false);
        return;
      }
      try {
        // Ajoute angle (inclinaison) et aspect (azimut) à la requête
        const azimut = orientationAzimut[orientation] ?? 180;
        const angle = inclinaison;
        const totalLoss =
          Number(pvLoss) + Number(cableLoss) + Number(inverterLoss);
        let urlPVGIS = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${coords.lat}&lon=${coords.lng}&raddatabase=PVGIS-SARAH3&peakpower=${kw}&loss=${totalLoss}&angle=${angle}&aspect=${azimut}&outputformat=json`;
        // Utilise le proxy local en dev, proxy Vercel en prod
        // Utilise toujours le proxy Vercel en production comme en dev
        let proxyUrl = `https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodeURIComponent(
          urlPVGIS
        )}`;
        let res, kwh;
        console.log('PVGIS URL:', urlPVGIS);
        try {
          res = await axios.get(proxyUrl);
          console.log('Réponse reçue du proxy PVGIS:', res.data); // LOG DEBUG
          // Log pour debug la structure de outputs.totals
          console.log('outputs.totals:', res.data?.outputs?.totals);
          // Correction du parsing pour E_y
          let totals = res.data?.outputs?.totals;
          if (totals?.fixed?.E_y) {
            kwh = totals.fixed.E_y;
          } else if (totals?.E_y) {
            kwh = totals.E_y;
          } else {
            kwh = 0;
          }
          console.log('Production annuelle brute PVGIS (E_y):', kwh);
          if (!kwh) {
            console.warn('PVGIS ERA5 no kwh, response:', res.data);
          }
          setProdMoyenneKwh(kwh || 0);
          setLoadingPVGIS(false);
        } catch (err) {
          // Si PVcalc échoue, tente v5_2/PVcalc
          urlPVGIS = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${coords.lat}&lon=${coords.lng}&raddatabase=PVGIS-SARAH3&peakpower=${kw}&loss=${totalLoss}&angle=${angle}&aspect=${azimut}&outputformat=json`;
          // À placer à l'endroit pertinent dans le formulaire/calculateur (dans le JSX)
          /*
  <div style={{ margin: '18px 0', display: 'flex', gap: 24 }}>
    <div>
      <label>Pertes PV (%)</label>
      <input type="number" min={0} max={10} value={pvLoss} onChange={e => setPvLoss(e.target.value)} style={{ width: 60 }} />
    </div>
    <div>
      <label>Pertes câbles (%)</label>
      <input type="number" min={0} max={10} value={cableLoss} onChange={e => setCableLoss(e.target.value)} style={{ width: 60 }} />
    </div>
    <div>
      <label>Pertes onduleur (%)</label>
      <input type="number" min={0} max={15} value={inverterLoss} onChange={e => setInverterLoss(e.target.value)} style={{ width: 60 }} />
    </div>
    <div style={{ fontWeight: 600, color: '#2563eb', marginLeft: 18 }}>
      Total pertes : {Number(pvLoss) + Number(cableLoss) + Number(inverterLoss)} %
    </div>
  </div>
  */
          proxyUrl = `https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodeURIComponent(
            urlPVGIS
          )}`;
          console.log('PVGIS fallback URL:', urlPVGIS);
          try {
            res = await axios.get(proxyUrl);
            kwh = res.data?.outputs?.totals?.fixed?.E_y;
            if (!kwh) {
              console.warn('PVGIS v5_2 ERA5 no kwh, response:', res.data);
            }
          } catch (err2) {
            setProdMoyenneKwh(0);
            let msg = 'Erreur lors de la requête PVGIS (v5_2).';
            if (err2.response && err2.response.data) {
              if (err2.response.data.message) msg = err2.response.data.message;
              else if (err2.response.data.error) msg = err2.response.data.error;
              else if (typeof err2.response.data === 'string')
                msg = err2.response.data;
              msg += `\n(code ${err2.response.status})`;
              msg += '\n' + JSON.stringify(err2.response.data, null, 2);
            }
            setPvError(msg);
            console.error('PVGIS error:', err2);
            setLoadingPVGIS(false);
            return;
          }
        }
      } catch (err) {
        setPvError('Erreur lors de la requête PVGIS.');
        setLoadingPVGIS(false);
      }
    }
    fetchPVGIS();
    // eslint-disable-next-line
  }, [
    coords,
    kit,
    inclinaison,
    orientation,
    pvLoss,
    cableLoss,
    inverterLoss,
    refreshKey,
  ]);

  // Always call hooks at the top level
  useEffect(() => {
    if (
      showClientModal &&
      clientResults.length === 0 &&
      !loadingClients &&
      user &&
      user.email
    ) {
      setLoadingClients(true);
      // Filtrer les clients par emailManager
      import('firebase/firestore').then((firestore) => {
        const { query, where, getDocs, collection } = firestore;
        const q = query(
          collection(db, 'clients'),
          where('emailManager', '==', user.email)
        );
        getDocs(q)
          .then((snap) => {
            const results = [];
            snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
            setClientResults(results);
          })
          .catch(() => setAssignStatus('Erreur Firestore.'))
          .finally(() => setLoadingClients(false));
      });
    }
    // eslint-disable-next-line
  }, [showClientModal]);

  // ...existing code...
  // Empêche le reload à chaque saisie dans les formulaires
  const handleInputChange = (setter) => (e) => {
    e.preventDefault && e.preventDefault();
    setter(e.target.value);
  };
  // ...existing code...
  // Exemple d'utilisation :
  // const urlPVGIS = "https://re.jrc.ec.europa.eu/api/PVcalc?lat=-21.1151&lon=55.5364&raddatabase=PVGIS-ERA5&peakpower=6&loss=14&angle=20&aspect=0&outputformat=json";
  // const proxyUrl = `https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodeURIComponent(urlPVGIS)}`;
  // Résultat : https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=https%3A%2F%2Fre.jrc.ec.europa.eu%2Fapi%2FPVcalc%3Flat%3D-21.1151%26lon%3D55.5364%26raddatabase%3DPVGIS-ERA5%26peakpower%3D6%26loss%3D14%26angle%3D20%26aspect%3D0%26outputformat%3Djson

  // Permet de placer le marqueur sur la carte au clic
  function MapClickHandler() {
    useMapEvent('click', async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setCoords({ lat, lng });
      // Reverse geocoding OpenStreetMap Nominatim
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`
        );
        if (res.data && res.data.address) {
          setCountry(res.data.address.country || '');
          setCity(
            res.data.address.city ||
              res.data.address.town ||
              res.data.address.village ||
              ''
          );
          setStreet(res.data.address.road || '');
          setStreetNumber(res.data.address.house_number || '');
          setAdresseError('');
        } else {
          setCountry('');
          setCity('');
          setStreet('');
          setStreetNumber('');
          setAdresseError('Adresse non trouvée');
        }
      } catch (err) {
        setCountry('');
        setCity('');
        setStreet('');
        setStreetNumber('');
        setAdresseError("Erreur lors de la récupération de l'adresse");
      }
    });
    return null;
  }
  // ...existing code...

  // Met à jour prix centrale, prix net, montant à financer, prime et gain revente (surplus, bon tarif) quand kit/remise change
  useEffect(() => {
    const kitObj = kits.find((k) => k.value === kit);
    if (kitObj) {
      setPrixCentrale(kitObj.prix);
      setPrixNet(kitObj.prix - remise);
      setMontantFinance(kitObj.prix - remise - apport);
      setPrime(kitObj.prime);
    } else {
      setPrixCentrale(0);
      setPrixNet(0);
      setMontantFinance(0);
      setPrime(0);
    }
    // Ne touche plus à gainRevente ici !
  }, [kit, remise, apport, prodMoyenneKwh, kits, conso]);

  // Calcul économies annuelles (exemple : prodMoyenneKwh * 0.18€/kWh)
  useEffect(() => {
    if (prodMoyenneKwh && conso) {
      setEco((prodMoyenneKwh * 0.18).toFixed(0));
    } else {
      setEco(0);
    }
  }, [prodMoyenneKwh, conso]);

  // Calcul du tableau de rentabilité sur 20 ans avec +5%/an sur le prix EDF
  useEffect(() => {
    if (!prodMoyenneKwh || !conso || !prixNet) {
      setRentabilite([]);
      return;
    }
    const prixEdfBase = 0.25; // €/kWh (tarif Réunion 2025, MAJ)
    let prixEdf = prixEdfBase;
    const rows = [];
    // Détermine le prix de revente selon le kit
    let prixRevente = tarifRachatAdmin !== null ? tarifRachatAdmin : 0.1741; // défaut 3,6,9kW
    if (kit.startsWith('12KWh'))
      prixRevente = tarifRachatAdmin !== null ? tarifRachatAdmin : 0.0894;
    // Nouvelle logique : remboursement anticipé de la prime à partir de la 2e année
    let montantRestant = montantFinance;
    let moisRestant = mois;
    let tauxRestant = tauxEffectif;
    let mensualiteCourante = mensualite;
    let primeUtilisee = false;
    for (let i = 0; i < 20; i++) {
      const annee = currentYear + i;
      const coutEdf = (conso * prixEdf).toFixed(0);
      // Mensualité EDF = coût EDF / 12
      const mensualiteEdf = ((conso * prixEdf) / 12).toFixed(2);
      let coutCentrale = 0;
      let mensualiteCentrale = 0;
      if (paiementComptant) {
        // Paiement comptant : tout est payé d'avance, donc 0 partout
        coutCentrale = 0;
        mensualiteCentrale = 0;
      } else {
        // Si encore en remboursement
        if (moisRestant > 0) {
          // À partir de la 2e année, on déduit la prime du solde restant (une seule fois)
          if (i === 1 && prime && !primeUtilisee) {
            montantRestant = Math.max(0, montantRestant - prime);
            // Recalcule la mensualité sur le solde restant et la durée restante
            const t = tauxRestant / 100 / 12;
            if (t === 0) {
              mensualiteCourante = moisRestant
                ? (montantRestant / moisRestant).toFixed(2)
                : '0.00';
            } else {
              mensualiteCourante = moisRestant
                ? (
                    (montantRestant * t) /
                    (1 - Math.pow(1 + t, -moisRestant))
                  ).toFixed(2)
                : '0.00';
            }
            primeUtilisee = true;
          }
          // Coût centrale = mensualité courante * 12, mais si moins de 12 mois restants, on ajuste
          if (moisRestant >= 12) {
            coutCentrale = (mensualiteCourante * 12).toFixed(0);
            mensualiteCentrale = mensualiteCourante;
            moisRestant -= 12;
          } else {
            coutCentrale = (mensualiteCourante * moisRestant).toFixed(0);
            mensualiteCentrale = moisRestant > 0 ? mensualiteCourante : 0;
            moisRestant = 0;
          }
        }
      }
      // Revente estimée annuelle : toujours la valeur unique de gainRevente
      rows.push({
        annee,
        coutEdf: Number(coutEdf),
        coutCentrale: Number(coutCentrale),
        prixEdfCts: (prixEdf * 100).toFixed(1),
        reventeEstimee: Number(gainRevente),
        diff: Number(coutEdf) - Number(coutCentrale),
        mensualiteEdf,
        mensualiteCentrale,
      });
      prixEdf *= 1.05;
    }
    setRentabilite(rows);
  }, [
    prodMoyenneKwh,
    conso,
    prixNet,
    mensualite,
    mois,
    montantFinance,
    tauxEffectif,
    prime,
    kit,
  ]);
  // ...existing code...

  // Met à jour taux/durée max quand banque change
  const handleBanqueChange = (e) => {
    const b = banques.find((bk) => bk.nom === e.target.value);
    setBanque(b.nom);
    // Logique spéciale pour BNB selon la durée
    if (b.nom === 'BNB') {
      let tauxBNB = 5.3;
      if (mois >= 96 && mois <= 108) tauxBNB = 5.6;
      else if (mois >= 72 && mois < 96) tauxBNB = 5.4;
      else tauxBNB = 5.3;
      setTaux(tauxBNB);
      setDureeMax(108);
      setMois(60); // Valeur par défaut 5 ans
    } else {
      setTaux(b.taux);
      setDureeMax(b.dureeMax);
      setMois(b.dureeMax);
    }
  };

  // Calcul de la mensualité (formule crédit classique)
  // Ajuste le taux BNB selon la durée choisie
  // (supprimé, déjà déclaré plus haut)

  // ...
  // Requête PVGIS à chaque changement de coords ou kit
  useEffect(() => {
    async function fetchPVGIS() {
      setLoadingPVGIS(true);
      setPvError('');
      if (!coords.lat || !coords.lng || !kit) {
        setProdMoyenneKwh(0);
        setLoadingPVGIS(false);
        return;
      }
      // Parse kit to get kW
      let kw = 0;
      const kitParts = kit.split(' ');
      if (kitParts.length > 0) {
        const puissanceStr = kitParts[0].replace('KWh', '');
        kw = parseInt(puissanceStr, 10);
      }
      if (!kw) {
        setProdMoyenneKwh(0);
        setPvError('Sélectionnez un kit pour estimer la production.');
        setLoadingPVGIS(false);
        return;
      }
      try {
        // Ajoute angle (inclinaison) et aspect (azimut) à la requête
        const azimut = orientationAzimut[orientation] ?? 180;
        const angle = inclinaison;
        let url = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${coords.lat}&lon=${coords.lng}&raddatabase=PVGIS-ERA5&peakpower=${kw}&loss=14&angle=${angle}&aspect=${azimut}&outputformat=json`;
        let proxyUrl = `https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodeURIComponent(
          url
        )}`;
        let res, kwh;
        console.log('PVGIS URL:', url);
        try {
          res = await axios.get(proxyUrl);
          console.log('Réponse reçue du proxy PVGIS:', res.data); // LOG DEBUG
          // Log pour debug la structure de outputs.totals
          console.log('outputs.totals:', res.data?.outputs?.totals);
          // Correction du parsing pour E_y
          let totals = res.data?.outputs?.totals;
          if (totals?.fixed?.E_y) {
            kwh = totals.fixed.E_y;
          } else if (totals?.E_y) {
            kwh = totals.E_y;
          } else {
            kwh = 0;
          }
          if (!kwh) {
            console.warn('PVGIS ERA5 no kwh, response:', res.data);
          }
          setProdMoyenneKwh(kwh || 0);
          setLoadingPVGIS(false);
        } catch (err) {
          // Si PVcalc échoue, tente v5_2/PVcalc
          url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${coords.lat}&lon=${coords.lng}&raddatabase=PVGIS-ERA5&peakpower=${kw}&loss=14&angle=${angle}&aspect=${azimut}&outputformat=json`;
          proxyUrl = `https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodeURIComponent(
            url
          )}`;
          console.log('PVGIS fallback URL:', url);
          try {
            res = await axios.get(proxyUrl);
            kwh = res.data?.outputs?.totals?.fixed?.E_y;
            if (!kwh) {
              console.warn('PVGIS v5_2 ERA5 no kwh, response:', res.data);
            }
          } catch (err2) {
            setProdMoyenneKwh(0);
            let msg = 'Erreur lors de la requête PVGIS (v5_2).';
            if (err2.response && err2.response.data) {
              if (err2.response.data.message) msg = err2.response.data.message;
              else if (err2.response.data.error) msg = err2.response.data.error;
              else if (typeof err2.response.data === 'string')
                msg = err2.response.data;
              msg += `\n(code ${err2.response.status})`;
              msg += '\n' + JSON.stringify(err2.response.data, null, 2);
            }
            setPvError(msg);
            console.error('PVGIS error:', err2);
            setLoadingPVGIS(false);
            return;
          }
        }
      } catch (err) {
        setPvError('Erreur lors de la requête PVGIS.');
        setLoadingPVGIS(false);
      }
    }
    fetchPVGIS();
    // eslint-disable-next-line
  }, [coords, kit, inclinaison, orientation]);

  // ... Placez ici les autres hooks, calculs, et variables nécessaires ...

  // Calcul du totalDiff sur 20 ans (différence annuelle cumulée)
  const diffArray = rentabilite
    ? rentabilite.map(
        (row) =>
          row.coutEdf -
          (row.coutCentrale || 0) -
          (consoNuitJour > capaciteBatterie
            ? (consoNuitJour - capaciteBatterie) * 365
            : 0) *
            0.25 +
          (row.reventeEstimee || 0)
      )
    : [];
  const totalDiff = diffArray.reduce((acc, v) => acc + v, 0);
  // Calcul de l'année de rentabilité (première année où diff > 0)
  let anneeRentableIndex = -1;
  if (paiementComptant) {
    // On cherche la première année où la colonne cumul (retour sur investissement) devient positive
    for (let i = 0; i < rentabilite.length; i++) {
      // La colonne cumul est calculée et affichée dans le tableau HTML, mais ici on la recalcule pour le tag
      let cumul = -prixNet;
      for (let j = 0; j <= i; j++) {
        cumul +=
          (Number(rentabilite[j].coutEdf) || 0) +
          (Number(rentabilite[j].reventeEstimee) || 0);
        if (j === 1 && prime) {
          cumul += Number(prime);
        }
      }
      if (cumul > 0) {
        anneeRentableIndex = i;
        break;
      }
    }
  } else {
    anneeRentableIndex = diffArray.findIndex((v) => v > 0);
  }
  const anneeRentable =
    anneeRentableIndex !== -1 ? rentabilite[anneeRentableIndex] : null;
  const nbAnneesRentable = anneeRentable
    ? anneeRentable.annee - currentYear + 1
    : null;

  // Always call hooks at the top level
  useEffect(() => {
    if (showClientModal && clientResults.length === 0 && !loadingClients) {
      setLoadingClients(true);
      getDocs(collection(db, 'clients'))
        .then((snap) => {
          const results = [];
          snap.forEach((doc) => results.push({ id: doc.id, ...doc.data() }));
          setClientResults(results);
        })
        .catch(() => setAssignStatus('Erreur Firestore.'))
        .finally(() => setLoadingClients(false));
    }
    // eslint-disable-next-line
  }, [showClientModal]);

  // Modale de sélection client (injectée dans le JSX principal)
  let clientModal = null;
  if (showClientModal) {
    clientModal = (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(30,41,59,0.18)',
          zIndex: 1000,
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
            onClick={() => {
              setShowClientModal(false);
              setAssignStatus('');
              setClientResults([]);
              setSearchClient('');
              setSelectedClient(null);
            }}
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
          <h3
            style={{
              color: '#3730a3',
              fontWeight: 900,
              fontSize: 22,
              marginBottom: 18,
            }}
          >
            Assigner à un client CRM
          </h3>

          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Recherche nom ou email..."
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1.5px solid #c7d2fe',
                padding: 10,
                fontSize: 16,
                marginBottom: 8,
              }}
            />
            <button
              onClick={async () => {
                setAssignStatus('');
                setLoadingClients(true);
                let results = [];
                if (searchClient.trim() === '') {
                  // Si pas de recherche, on recharge tous les clients
                  const snap = await getDocs(collection(db, 'clients'));
                  snap.forEach((doc) =>
                    results.push({ id: doc.id, ...doc.data() })
                  );
                } else {
                  // Recherche par nom ou email
                  const snap = await getDocs(collection(db, 'clients'));
                  snap.forEach((doc) => {
                    const data = doc.data();
                    if (
                      (data.nom &&
                        data.nom
                          .toLowerCase()
                          .includes(searchClient.toLowerCase())) ||
                      (data.email &&
                        data.email
                          .toLowerCase()
                          .includes(searchClient.toLowerCase()))
                    ) {
                      results.push({ id: doc.id, ...data });
                    }
                  });
                }
                setClientResults(results);
                if (results.length === 0)
                  setAssignStatus('Aucun client trouvé.');
                setLoadingClients(false);
              }}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 16,
                marginBottom: 4,
                cursor: 'pointer',
              }}
            >
              Rechercher
            </button>
          </div>
          {loadingClients && (
            <div style={{ color: '#6366f1', marginBottom: 8 }}>
              Chargement...
            </div>
          )}
          {clientResults.length > 0 && (
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                marginBottom: 10,
                border: '1px solid #e0e7ff',
                borderRadius: 8,
              }}
            >
              {clientResults.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #e0e7ff',
                    cursor: 'pointer',
                    background:
                      selectedClient && selectedClient.id === c.id
                        ? '#e0e7ff'
                        : '#fff',
                  }}
                  onClick={() => setSelectedClient(c)}
                >
                  <b>{c.nom || c.email}</b>{' '}
                  <span style={{ color: '#64748b', fontSize: 14 }}>
                    {c.email}
                  </span>
                </div>
              ))}
            </div>
          )}
          {selectedClient && (
            <button
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 800,
                fontSize: 16,
                marginTop: 10,
                cursor: 'pointer',
              }}
              onClick={async () => {
                setAssignStatus('Enregistrement...');
                // Prépare l'étude à sauvegarder
                // Génère le HTML du tableau de rentabilité exactement comme affiché
                function getTableauRentabiliteHtml(rentabilite) {
                  let cumul = paiementComptant ? -prixNet : 0;
                  let html = `<table style='margin:12px 0;border-collapse:collapse;background:#f3f4f6;border-radius:6;width:100%;'>`;
                  html += `<thead><tr>`;
                  // Colonnes à afficher selon le mode de paiement
                  let columns = [
                    { key: 'annee', label: 'Année' },
                    { key: 'coutEdf', label: 'Coût EDF (€)' },
                    { key: 'mensualiteEdf', label: 'Mensualité EDF (€)' },
                    { key: 'coutCentrale', label: 'Coût centrale (€)' },
                    {
                      key: 'mensualiteCentrale',
                      label: 'Mensualité centrale (€)',
                    },
                    { key: 'reventeEstimee', label: 'Revente estimée (€)' },
                    { key: 'eco', label: 'Éco. EDF (€)' },
                    {
                      key: 'diffPlusRevente',
                      label: 'Différence + Revente estimée (€)',
                    },
                    { key: 'prixEdfCts', label: 'Prix EDF (cts)' },
                  ];
                  // Si paiement comptant, on affiche la colonne 'Retour sur investissement'
                  if (paiementComptant) {
                    columns.splice(7, 0, {
                      key: 'cumul',
                      label: 'Retour sur investissement',
                    });
                  }
                  // Si ce n'est pas paiement comptant, on retire la colonne 'Différence'
                  if (!paiementComptant) {
                    columns = columns.filter((col) => col.key !== 'diff');
                    columns = columns.filter((col) => col.key !== 'cumul');
                  }
                  // Si paiement comptant, on masque les colonnes financement
                  if (paiementComptant) {
                    columns = columns.filter(
                      (col) =>
                        ![
                          'coutCentrale',
                          'mensualiteCentrale',
                          'diff',
                        ].includes(col.key)
                    );
                  }
                  columns.forEach((col) => {
                    html += `<th style='border:1px solid #d1d5db;padding:6px 12px;font-weight:600;background:#e0e7ff;color:#2563eb;'>${col.label}</th>`;
                  });
                  html += `</tr></thead><tbody>`;
                  let cumulRevente = 0;
                  rentabilite.forEach((row, idx) => {
                    if (paiementComptant) {
                      cumul +=
                        (Number(row.coutEdf) || 0) +
                        (Number(row.reventeEstimee) || 0);
                      // Ajoute la prime à la 2e année (idx === 1)
                      if (idx === 1 && prime) {
                        cumul += Number(prime);
                      }
                    } else {
                      cumul += Number(row.diff) || 0;
                    }
                    cumulRevente += Number(row.reventeEstimee) || 0;
                    html += `<tr>`;
                    columns.forEach((col) => {
                      let val = row[col.key];
                      let style = `border:1px solid #d1d5db;padding:6px 12px;font-size:15px;`;
                      if (col.key === 'diff') {
                        if (Number(val) >= 0)
                          style += 'color:#16a34a;font-weight:700;';
                      }
                      if (col.key === 'eco') {
                        // Pour paiement comptant, économie = coût EDF annuel (car coût centrale = 0)
                        if (paiementComptant) {
                          val =
                            row.coutEdf !== undefined
                              ? `${row.coutEdf.toLocaleString()} €`
                              : '-';
                        } else {
                          val = row.diff !== undefined ? `${row.diff} €` : '-';
                        }
                        style += 'color:#16a34a;font-weight:700;';
                      }
                      if (col.key === 'mensualiteCentrale') {
                        const centrale = Number(val);
                        const edf = Number(row['mensualiteEdf']);
                        if (!isNaN(centrale) && !isNaN(edf) && centrale < edf)
                          style += 'color:#16a34a;font-weight:700;';
                      }
                      if (col.key === 'reventeEstimee') {
                        style += 'color:#bfa100;font-weight:700;';
                      }
                      if (col.key === 'diffPlusRevente') {
                        const diff = Number(row['diff']) || 0;
                        const revente = Number(row['reventeEstimee']) || 0;
                        val = `${(diff + revente).toLocaleString()} €`;
                        style += 'color:#0e7490;font-weight:700;';
                      }
                      if (col.key === 'cumul') {
                        style += `font-weight:700;${
                          cumul >= 0 ? 'color:#16a34a;' : 'color:#dc2626;'
                        }`;
                        val = `${cumul.toLocaleString()} €`;
                      }
                      html += `<td style='${style}'>${
                        val !== undefined ? val : '-'
                      }</td>`;
                    });
                    html += `</tr>`;
                  });
                  // Ligne cumul revente sur 20 ans
                  html += `<tr style='background:#fffbe6;font-weight:900;'>`;
                  columns.forEach((col, idx) => {
                    if (col.key === 'reventeEstimee') {
                      html += `<td colspan='1' style='border:1.5px solid #ffe58f;padding:8px 12px;font-size:17px;font-weight:900;color:#bfa100;text-align:center;'>Cumul revente sur 20 ans : ${cumulRevente.toLocaleString()} €</td>`;
                    } else if (idx === columns.length - 1) {
                      html += `<td style='border:1.5px solid #ffe58f;padding:8px 12px;font-size:17px;font-weight:900;color:#0e7490;text-align:center;'>Total économies + revente : ${(rentabilite.reduce((sum, row) => sum + ((Number(row.diff) || 0) + (Number(row.reventeEstimee) || 0)), 0)).toLocaleString()} €</td>`;
                    } else {
                      html += `<td></td>`;
                    }
                  });
                  html += `</tr>`;
                  html += `</tbody></table>`;
                  // Ajout du cumul coût EDF, du retour sur investissement total, et du cumul Différence+Revente estimée sur 20 ans
                  const totalCoutEdf = rentabilite.reduce(
                    (sum, row) => sum + (Number(row.coutEdf) || 0),
                    0
                  );
                  const totalDiffPlusRevente = rentabilite.reduce(
                    (sum, row) =>
                      sum +
                      ((Number(row.diff) || 0) +
                        (Number(row.reventeEstimee) || 0)),
                    0
                  );
                  html += `<div style='margin-top:18px;display:flex;gap:32px;flex-wrap:wrap;'>`;
                  html += `<div style='font-size:28px;font-weight:900;color:#dc2626;background:#fff0f0;border-radius:10px;padding:14px 32px;'>Cumul coût EDF sur 20 ans : ${totalCoutEdf.toLocaleString()} €</div>`;
                  html += `<div style='font-size:28px;font-weight:900;color:#16a34a;background:#e0ffe0;border-radius:10px;padding:14px 32px;'>Retour sur investissement total sur 20 ans : ${totalCumul.toLocaleString()} €</div>`;
                  html += `<div style='font-size:28px;font-weight:900;color:#0e7490;background:#e0f7ff;border-radius:10px;padding:14px 32px;'>Cumul économies + revente sur 20 ans : ${totalDiffPlusRevente.toLocaleString()} €</div>`;
                  html += `</div>`;
                  return html;
                }
                // Calcul du totalCumul (retour sur investissement total sur 20 ans)
                let totalCumul = paiementComptant ? -prixNet : 0;
                for (let idx = 0; idx < rentabilite.length; idx++) {
                  if (paiementComptant) {
                    totalCumul +=
                      (Number(rentabilite[idx].coutEdf) || 0) +
                      (Number(rentabilite[idx].reventeEstimee) || 0);
                    if (idx === 1 && prime) {
                      totalCumul += Number(prime);
                    }
                  } else {
                    totalCumul += Number(rentabilite[idx].diff) || 0;
                  }
                }
                const etude = {
                  date: new Date().toISOString(),
                  conso,
                  kit,
                  inclinaison,
                  orientation,
                  country,
                  city,
                  street,
                  streetNumber,
                  coords,
                  prixCentrale,
                  prixNet,
                  remise,
                  apport,
                  montantFinance,
                  banque,
                  taux,
                  mois,
                  mensualite,
                  prodMoyenneKwh,
                  prime,
                  gainRevente,
                  eco,
                  rentabilite,
                  tableauRentabilite: rentabilite, // Tableau brut
                  tableauRentabiliteHtml:
                    getTableauRentabiliteHtml(rentabilite), // Tableau HTML complet
                  totalDiff,
                  nbAnneesRentable,
                  anneeRentable: anneeRentable?.annee || null,
                  modePaiement: paiementComptant ? 'comptant' : 'financement',
                  totalCumul: totalCumul,
                  totalCumulTableau: totalCumul,
                };
                try {
                  const ref = doc(db, 'clients', selectedClient.id);
                  // Récupérer les études existantes
                  const snap = await getDocs(
                    query(
                      collection(db, 'clients'),
                      where('id', '==', selectedClient.id)
                    )
                  );
                  let etudes = [];
                  if (
                    snap.docs.length > 0 &&
                    Array.isArray(snap.docs[0].data().Etude)
                  ) {
                    etudes = snap.docs[0].data().Etude;
                  }
                  etudes.push(etude);
                  await updateDoc(ref, { Etude: etudes });
                  setAssignStatus('Étude assignée au client !');
                } catch (e) {
                  setAssignStatus("Erreur lors de l'enregistrement.");
                }
              }}
            >
              Assigner à ce client
            </button>
          )}
          {assignStatus && (
            <div
              style={{
                marginTop: 12,
                color: assignStatus.includes('Erreur') ? '#dc2626' : '#10b981',
                fontWeight: 700,
              }}
            >
              {assignStatus}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Rendu principal ---
  return (
    <>
      {/* Champ de saisie pour la revente estimée par an */}
      <div
        style={{
          margin: '16px 0 24px 0',
          background: '#f3f4f6',
          padding: 16,
          borderRadius: 8,
          maxWidth: 340,
        }}
      >
        <label
          htmlFor="reventeManuelle"
          style={{ fontWeight: 700, color: '#3730a3' }}
        >
          Revente estimée par an (€) :
        </label>
        <input
          id="reventeManuelle"
          type="number"
          value={gainRevente}
          onChange={(e) => setGainRevente(e.target.value)}
          min="0"
          step="0.01"
          style={{
            marginLeft: 12,
            width: 120,
            fontSize: 16,
            padding: 4,
            borderRadius: 4,
            border: '1px solid #c7d2fe',
          }}
        />
      </div>
      {/* Aperçu PDF modal */}
      {showPdfPreview && (
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
              minWidth: 480,
              maxWidth: 900,
              position: 'relative',
              minHeight: 600,
            }}
          >
            <button
              onClick={() => {
                setShowPdfPreview(false);
                setPdfUrl(null);
              }}
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
            <h3
              style={{
                color: '#3730a3',
                fontWeight: 900,
                fontSize: 22,
                marginBottom: 18,
              }}
            >
              Aperçu PDF à envoyer au client
            </h3>
            {pdfLoading ? (
              <div
                style={{
                  textAlign: 'center',
                  color: '#6366f1',
                  fontWeight: 700,
                  fontSize: 18,
                  marginTop: 80,
                }}
              >
                Chargement du PDF...
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="Aperçu PDF"
                style={{
                  width: '100%',
                  height: 500,
                  border: '1.5px solid #e0e7ff',
                  borderRadius: 12,
                }}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: 18,
                  marginTop: 80,
                }}
              >
                Aucun PDF à afficher.
              </div>
            )}
            <div
              style={{
                marginTop: 18,
                display: 'flex',
                gap: 18,
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => {
                  setShowPdfPreview(false);
                  setPdfUrl(null);
                }}
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowPdfPreview(false);
                  handleGeneratePDF(false);
                }}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Télécharger PDF
              </button>
              <button
                onClick={async () => {
                  setIncludeDevisInPreview((v) => {
                    const newVal = !v;
                    setTimeout(() => handleGeneratePDF(true, newVal), 0);
                    return newVal;
                  });
                }}
                style={{
                  background: includeDevisInPreview ? '#6366f1' : '#e5e7eb',
                  color: includeDevisInPreview ? '#fff' : '#222',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {includeDevisInPreview
                  ? 'Exclure le devis de l’aperçu'
                  : 'Inclure le devis à l’aperçu'}
              </button>
            </div>
          </div>
        </div>
      )}
      {clientModal}
      <div
        style={{
          display: 'flex',
          gap: 40,
          padding: 40,
          minHeight: '100vh',
          background: 'linear-gradient(120deg,#f3f4f6 60%,#c7d2fe 100%)',
        }}
      >
        {/* Champs admin pour prime et tarif de rachat */}
        {role === 'admin' && (
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: 12,
              padding: 18,
              marginBottom: 24,
              maxWidth: 340,
            }}
          >
            <h4
              style={{
                color: '#3730a3',
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 12,
              }}
            >
              Paramètres administrateur
            </h4>
            <label style={{ fontWeight: 600, color: '#0e7490', fontSize: 15 }}>
              Prime 3 kWc (€)
            </label>
            <input
              type="number"
              value={prime3Admin ?? ''}
              onChange={(e) =>
                setPrime3Admin(e.target.value ? Number(e.target.value) : null)
              }
              min={0}
              step={1}
              style={{
                marginBottom: 12,
                width: 120,
                fontSize: 16,
                padding: 4,
                borderRadius: 4,
                border: '1px solid #c7d2fe',
              }}
            />
            <label style={{ fontWeight: 600, color: '#0e7490', fontSize: 15 }}>
              Prime 6 kWc (€)
            </label>
            <input
              type="number"
              value={prime6Admin ?? ''}
              onChange={(e) =>
                setPrime6Admin(e.target.value ? Number(e.target.value) : null)
              }
              min={0}
              step={1}
              style={{
                marginBottom: 12,
                width: 120,
                fontSize: 16,
                padding: 4,
                borderRadius: 4,
                border: '1px solid #c7d2fe',
              }}
            />
            <label style={{ fontWeight: 600, color: '#0e7490', fontSize: 15 }}>
              Prime 9 kWc (€)
            </label>
            <input
              type="number"
              value={prime9Admin ?? ''}
              onChange={(e) =>
                setPrime9Admin(e.target.value ? Number(e.target.value) : null)
              }
              min={0}
              step={1}
              style={{
                marginBottom: 12,
                width: 120,
                fontSize: 16,
                padding: 4,
                borderRadius: 4,
                border: '1px solid #c7d2fe',
              }}
            />
            <label style={{ fontWeight: 600, color: '#0e7490', fontSize: 15 }}>
              Tarif de rachat (€ / kWh)
            </label>
            <input
              type="number"
              value={tarifRachatAdmin ?? ''}
              onChange={(e) =>
                setTarifRachatAdmin(
                  e.target.value ? Number(e.target.value) : null
                )
              }
              min={0}
              step={0.0001}
              style={{
                width: 120,
                fontSize: 16,
                padding: 4,
                borderRadius: 4,
                border: '1px solid #c7d2fe',
              }}
            />
            <button
              onClick={saveParams}
              style={{
                marginTop: 16,
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Enregistrer
            </button>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
              Ces valeurs sont appliquées à tous les calculs et utilisateurs.
            </div>
            {loadingParams && (
              <div style={{ color: '#6366f1', marginTop: 8 }}>
                Chargement paramètres...
              </div>
            )}
          </div>
        )}
        {/* Colonne principale infos centrale/client */}
        {/* Champ de saisie pour la revente estimée par an (juste au-dessus du tableau de rentabilité) */}
        <div
          style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 8,
            padding: 12,
            marginBottom: 18,
            maxWidth: 340,
          }}
        >
          <label
            htmlFor="reventeManuelle2"
            style={{ fontWeight: 700, color: '#b45309' }}
          >
            Revente estimée par an (€) :
          </label>
          <input
            id="reventeManuelle2"
            type="number"
            value={gainRevente}
            onChange={(e) => setGainRevente(e.target.value)}
            min="0"
            step="0.01"
            style={{
              marginLeft: 12,
              width: 120,
              fontSize: 16,
              padding: 4,
              borderRadius: 4,
              border: '1px solid #ffe58f',
            }}
          />
        </div>
        <div
          style={{
            flex: 2,
            background: 'rgba(255,255,255,0.98)',
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(99,102,241,0.10)',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
            border: '1.5px solid #e0e7ff',
          }}
        >
          <h2
            style={{
              color: '#3730a3',
              fontWeight: 900,
              fontSize: 28,
              marginBottom: 18,
            }}
          >
            Simulation centrale photovoltaïque
            <button
              style={{
                marginLeft: 24,
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: 16,
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 2px 8px #c7d2fe',
              }}
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              Rafraîchir la simulation
            </button>
          </h2>
          {/* Bloc moderne de saisie des paramètres */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 28,
              background: 'linear-gradient(90deg,#e0e7ff 60%,#f3f4f6 100%)',
              borderRadius: 18,
              padding: 32,
              boxShadow: '0 2px 12px #c7d2fe',
              marginBottom: 8,
              alignItems: 'center',
              border: '1.5px solid #c7d2fe',
            }}
          >
            {/* Champs pertes PV, câbles, onduleur */}
            <div style={{ gridColumn: '1 / span 2', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div>
                  <label
                    style={{ fontWeight: 700, color: '#3730a3', fontSize: 15 }}
                  >
                    Pertes PV (%)
                  </label>
                  <br />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={pvLoss}
                    onChange={(e) => setPvLoss(e.target.value)}
                    style={{
                      width: 60,
                      fontSize: 16,
                      borderRadius: 8,
                      border: '1.5px solid #6366f1',
                      padding: 6,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{ fontWeight: 700, color: '#3730a3', fontSize: 15 }}
                  >
                    Pertes câbles (%)
                  </label>
                  <br />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={cableLoss}
                    onChange={(e) => setCableLoss(e.target.value)}
                    style={{
                      width: 60,
                      fontSize: 16,
                      borderRadius: 8,
                      border: '1.5px solid #6366f1',
                      padding: 6,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{ fontWeight: 700, color: '#3730a3', fontSize: 15 }}
                  >
                    Pertes onduleur (%)
                  </label>
                  <br />
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={inverterLoss}
                    onChange={(e) => setInverterLoss(e.target.value)}
                    style={{
                      width: 60,
                      fontSize: 16,
                      borderRadius: 8,
                      border: '1.5px solid #6366f1',
                      padding: 6,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: '#2563eb',
                    marginLeft: 18,
                    fontSize: 16,
                  }}
                >
                  Total pertes :{' '}
                  {Number(pvLoss) + Number(cableLoss) + Number(inverterLoss)} %
                </div>
              </div>
            </div>
            {/* Kit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                <span role="img" aria-label="Kit">
                  🔋
                </span>{' '}
                Kit
              </label>
              <select
                value={kit}
                onChange={(e) => setKit(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '2px solid #6366f1',
                  fontSize: 16,
                  background: '#fff',
                  color: '#3730a3',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px #e0e7ff',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              >
                <option value="">Sélectionner un kit</option>
                {kits.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label} {k.value !== 'plugandplay' ? `(${k.prix} €)` : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Consommation + slider jour/nuit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                <span role="img" aria-label="Conso">
                  ⚡️
                </span>{' '}
                Consommation annuelle (kWh)
              </label>
              <input
                type="number"
                value={conso}
                onChange={(e) => setConso(e.target.value)}
                placeholder="ex: 3500"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '2px solid #6366f1',
                  fontSize: 16,
                  background: '#fff',
                  color: '#3730a3',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: '0 2px 8px #e0e7ff',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
              <div style={{ marginTop: 12 }}>
                <label
                  style={{ fontWeight: 700, color: '#3730a3', fontSize: 15 }}
                >
                  Répartition consommation&nbsp;:
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  <span style={{ color: '#6366f1', fontWeight: 700 }}>
                    Jour&nbsp;{pourcentageJour}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={pourcentageJour}
                    onChange={(e) => setPourcentageJour(Number(e.target.value))}
                    style={{
                      flex: 1,
                      accentColor: '#6366f1',
                      height: 6,
                      borderRadius: 6,
                      background:
                        'linear-gradient(90deg,#6366f1 0%,#a5b4fc 100%)',
                    }}
                  />
                  <span style={{ color: '#0e7490', fontWeight: 700 }}>
                    Nuit&nbsp;{100 - pourcentageJour}%
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#64748b' }}>
                  Conso jour&nbsp;: <b>{consoJour.toFixed(0)} kWh/an</b>{' '}
                  &nbsp;|&nbsp; Conso nuit&nbsp;:{' '}
                  <b>{consoNuit.toFixed(0)} kWh/an</b>
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Conso jour&nbsp;:{' '}
                  <b>{(consoJour / 365).toFixed(2)} kWh/jour</b>
                  &nbsp;|&nbsp; Conso nuit&nbsp;:{' '}
                  <b>{(consoNuit / 365).toFixed(2)} kWh/jour</b>
                </div>
                {capaciteBatterie > 0 && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      color: capaciteBatterie > 0 ? '#10b981' : '#dc2626',
                      fontWeight: 700,
                    }}
                  >
                    Capacité batterie&nbsp;: {capaciteBatterie} kWh
                  </div>
                )}
              </div>
            </div>
            {/* Inclinaison */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                <span role="img" aria-label="Inclinaison">
                  📐
                </span>{' '}
                Inclinaison (°)
              </label>
              <input
                type="number"
                value={inclinaison}
                min={0}
                max={90}
                onChange={(e) => setInclinaison(Number(e.target.value))}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '2px solid #6366f1',
                  fontSize: 16,
                  background: '#fff',
                  color: '#3730a3',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: '0 2px 8px #e0e7ff',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
            </div>
            {/* Remise */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                <span role="img" aria-label="Remise">
                  💸
                </span>{' '}
                Remise (€)
              </label>
              <input
                type="number"
                value={remise}
                min={0}
                max={prixCentrale}
                onChange={(e) => setRemise(Number(e.target.value))}
                placeholder="ex: 500"
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '2px solid #10b981',
                  fontSize: 16,
                  background: '#fff',
                  color: '#065f46',
                  fontWeight: 700,
                  width: '100%',
                  boxShadow: '0 2px 8px #a7f3d0',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              />
            </div>
            {/* Orientation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                <span role="img" aria-label="Orientation">
                  🧭
                </span>{' '}
                Orientation
              </label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: '2px solid #6366f1',
                  fontSize: 16,
                  background: '#fff',
                  color: '#3730a3',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px #e0e7ff',
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
              >
                {Object.keys(orientationAzimut).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            {/* Adresse + bouton géolocalisation */}
            <div
              style={{
                gridColumn: '1 / span 2',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <label
                style={{
                  color: '#6366f1',
                  fontWeight: 800,
                  fontSize: 16,
                  marginBottom: 2,
                }}
              >
                <span role="img" aria-label="Adresse">
                  📍
                </span>{' '}
                Adresse
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Pays"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '2px solid #6366f1',
                    fontSize: 14,
                    width: 100,
                  }}
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ville"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '2px solid #6366f1',
                    fontSize: 14,
                    width: 120,
                  }}
                />
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rue"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '2px solid #6366f1',
                    fontSize: 14,
                    width: 180,
                  }}
                />
                <input
                  type="text"
                  value={streetNumber}
                  onChange={(e) => setStreetNumber(e.target.value)}
                  placeholder="Numéro"
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: '2px solid #6366f1',
                    fontSize: 14,
                    width: 70,
                  }}
                />
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: '#10b981',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    marginLeft: 8,
                    cursor: 'pointer',
                  }}
                  title="Utiliser ma localisation actuelle"
                >
                  Utiliser ma localisation
                </button>
              </div>
              {adresseError && (
                <span
                  style={{ color: '#dc2626', marginLeft: 4, fontWeight: 700 }}
                >
                  {adresseError}
                </span>
              )}
            </div>
          </div>
          <div
            style={{
              height: 260,
              marginTop: 18,
              borderRadius: 12,
              overflow: 'hidden',
              border: '1.5px solid #c7d2fe',
            }}
          >
            <MapContainer
              center={coords}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler />
              <Marker
                position={coords}
                icon={L.icon({
                  iconUrl:
                    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowUrl:
                    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
                  shadowSize: [41, 41],
                })}
              />
            </MapContainer>
          </div>
          {/* 4 cases infos clés sous la carte */}
          <div
            style={{ display: 'flex', gap: 18, marginTop: 18, marginBottom: 8 }}
          >
            <div
              style={{
                flex: 1,
                background: '#f1f5f9',
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
                fontWeight: 700,
                color: '#3730a3',
                fontSize: 16,
              }}
            >
              Production annuelle estimée
              <br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>
                {loadingPVGIS
                  ? 'Calcul...'
                  : prodMoyenneKwh
                  ? prodMoyenneKwh + ' kWh'
                  : pvError || '-'}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                background: '#f1f5f9',
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
                fontWeight: 700,
                color: '#3730a3',
                fontSize: 16,
              }}
            >
              Revente estimée par an
              <br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>
                {rentabilite && rentabilite.length > 0
                  ? rentabilite[0].reventeEstimee + ' €'
                  : '-'}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                background: '#f1f5f9',
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
                fontWeight: 700,
                color: '#3730a3',
                fontSize: 16,
              }}
            >
              Prime EDF
              <br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>
                {prime ? prime + ' €' : '-'}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                background: '#f1f5f9',
                borderRadius: 10,
                padding: 16,
                textAlign: 'center',
                fontWeight: 700,
                color: '#3730a3',
                fontSize: 16,
              }}
            >
              Années pour rentabilité
              <br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>
                {paiementComptant
                  ? (() => {
                      // Calcul du nombre d'années avant que le retour sur investissement passe en vert
                      let prixEdfBase = 0.25;
                      let consoReelle = conso ? Number(conso) : 0;
                      let solde = prixNet;
                      let nbAnnees = '-';
                      for (let i = 0; i < rentabilite.length; i++) {
                        let prixEdfAnnee = modeAugmentation
                          ? prixEdfBase * Math.pow(1.05, i)
                          : prixEdfBase;
                        let economieEDF =
                          Math.min(prodMoyenneKwh, consoReelle) * prixEdfAnnee;
                        let primeAnnee = i === 1 ? prime : 0;
                        let revente = rentabilite[i].reventeEstimee || 0;
                        let residuelEDFAn =
                          consoNuitJour > capaciteBatterie
                            ? (consoNuitJour - capaciteBatterie) * 365
                            : 0;
                        let coutResiduelEDF = residuelEDFAn * prixEdfAnnee;
                        solde -=
                          economieEDF + primeAnnee + revente - coutResiduelEDF;
                        if (solde <= 0) {
                          nbAnnees = i + 1;
                          break;
                        }
                      }
                      return nbAnnees !== '-' ? nbAnnees + ' an(s)' : '-';
                    })()
                  : nbAnneesRentable
                  ? nbAnneesRentable + ' an(s)'
                  : '-'}
              </span>
            </div>
          </div>
          {/* Bannière rentabilité sous les cases */}
          <div
            style={{
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: 8,
              padding: 10,
              fontWeight: 800,
              fontSize: 18,
              margin: '8px 0 0 0',
              textAlign: 'center',
            }}
          >
            {paiementComptant
              ? (() => {
                  let prixEdfBase = 0.25;
                  let consoReelle = conso ? Number(conso) : 0;
                  let solde = prixNet;
                  let nbAnnees = '-';
                  for (let i = 0; i < rentabilite.length; i++) {
                    let prixEdfAnnee = modeAugmentation
                      ? prixEdfBase * Math.pow(1.05, i)
                      : prixEdfBase;
                    let economieEDF =
                      Math.min(prodMoyenneKwh, consoReelle) * prixEdfAnnee;
                    let primeAnnee = i === 1 ? prime : 0;
                    let revente = rentabilite[i].reventeEstimee || 0;
                    let residuelEDFAn =
                      consoNuitJour > capaciteBatterie
                        ? (consoNuitJour - capaciteBatterie) * 365
                        : 0;
                    let coutResiduelEDF = residuelEDFAn * prixEdfAnnee;
                    solde -=
                      economieEDF + primeAnnee + revente - coutResiduelEDF;
                    if (solde <= 0) {
                      nbAnnees = i + 1;
                      break;
                    }
                  }
                  return nbAnnees !== '-'
                    ? `Projet rentable en ${nbAnnees} an(s)`
                    : 'Rentabilité non atteinte';
                })()
              : nbAnneesRentable
              ? `Projet rentable en ${nbAnneesRentable} an(s)`
              : 'Rentabilité non atteinte'}
          </div>
          {/* Bloc supprimé : résultats détaillés sous la carte, on garde seulement les 4 cases infos clés */}
          {/* Tableau de rentabilité sur 20 ans */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginBottom: 12,
                alignItems: 'center',
              }}
            >
              <button
                onClick={() => setModeAugmentation(true)}
                style={{
                  background: modeAugmentation ? '#6366f1' : '#e0e7ff',
                  color: modeAugmentation ? '#fff' : '#6366f1',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: modeAugmentation ? '0 2px 8px #c7d2fe' : 'none',
                }}
              >
                Avec augmentation
              </button>
              <button
                onClick={() => setModeAugmentation(false)}
                style={{
                  background: !modeAugmentation ? '#6366f1' : '#e0e7ff',
                  color: !modeAugmentation ? '#fff' : '#6366f1',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: 'pointer',
                  boxShadow: !modeAugmentation ? '0 2px 8px #c7d2fe' : 'none',
                }}
              >
                Sans augmentation
              </button>
              {!paiementComptant && (
                <div
                  style={{
                    marginLeft: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <label
                    style={{ fontWeight: 700, color: '#3730a3', fontSize: 15 }}
                  >
                    Réinjecter la prime dans le financement
                  </label>
                  <input
                    type="checkbox"
                    checked={reinjectPrime}
                    onChange={(e) => setReinjectPrime(e.target.checked)}
                    style={{
                      width: 22,
                      height: 22,
                      accentColor: '#6366f1',
                      cursor: 'pointer',
                    }}
                  />
                </div>
              )}
            </div>
            <h4 style={{ color: '#3730a3', fontWeight: 700, fontSize: 20 }}>
              Tableau de rentabilité (20 ans){' '}
              {modeAugmentation ? 'avec augmentation' : 'sans augmentation'}
            </h4>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: '#fff',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 2px 8px #e0e7ff',
              }}
            >
              <thead>
                <tr style={{ background: '#c7d2fe' }}>
                  <th style={{ padding: 8 }}>Année</th>
                  <th style={{ padding: 8 }}>Coût EDF</th>
                  <th style={{ padding: 8 }}>Prix EDF (cts/kWh)</th>
                  {paiementComptant ? (
                    <>
                      <th style={{ padding: 8, color: '#10b981' }}>
                        Retour sur investissement
                      </th>
                      <th style={{ padding: 8 }}>Économies EDF</th>
                      <th style={{ padding: 8, color: '#dc2626' }}>
                        Résiduel EDF
                      </th>
                      <th style={{ padding: 8 }}>Gains revente</th>
                      <th style={{ padding: 8, color: '#0e7490' }}>
                        Économies EDF + Gains
                      </th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: 8, color: '#2563eb' }}>
                        Mensualité EDF
                      </th>
                      <th style={{ padding: 8 }}>Coût centrale</th>
                      <th style={{ padding: 8, color: '#2563eb' }}>
                        Mensualité centrale
                      </th>
                      <th style={{ padding: 8 }}>Revente estimée</th>
                      <th style={{ padding: 8, color: '#dc2626' }}>
                        Coût résiduel EDF
                      </th>
                      <th style={{ padding: 8 }}>Différence</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rentabilite && rentabilite.length > 0 ? (
                  rentabilite.map((row, i) => {
                    if (paiementComptant) {
                      // Calcul du retour sur investissement, économies EDF, gains revente et total
                      // Calcul dynamique des économies EDF selon l'année et le mode augmentation
                      let prixEdfBase = 0.25;
                      let prixEdfAnnee = modeAugmentation
                        ? prixEdfBase * Math.pow(1.05, i)
                        : prixEdfBase;
                      // Économies EDF = min(production, conso) * prix électricité
                      let consoReelle = conso ? Number(conso) : 0;
                      let economieEDF =
                        Math.min(prodMoyenneKwh, consoReelle) * prixEdfAnnee;
                      let primeAnnee = i === 1 ? prime : 0;
                      let revente = row.reventeEstimee || 0;
                      // Calcul du résiduel EDF annuel (selon la répartition conso/batterie) avec augmentation
                      let residuelEDFAn =
                        consoNuitJour > capaciteBatterie
                          ? (consoNuitJour - capaciteBatterie) * 365
                          : 0;
                      let coutResiduelEDF = residuelEDFAn * prixEdfAnnee;
                      let totalEconomie =
                        economieEDF + primeAnnee + revente - coutResiduelEDF;
                      // Calcul du solde restant à récupérer
                      let solde = prixNet;
                      for (let j = 0; j <= i; j++) {
                        let ecoJ = eco ? Number(eco) : 0;
                        let primeJ = j === 1 ? prime : 0;
                        let revJ = rentabilite[j].reventeEstimee || 0;
                        // Calcul du résiduel EDF pour chaque année (une seule déclaration)
                        let residuelJ =
                          consoNuitJour > capaciteBatterie
                            ? (consoNuitJour - capaciteBatterie) * 365 * 0.25
                            : 0;
                        solde -= ecoJ + primeJ + revJ - residuelJ;
                      }
                      return (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? '#f1f5f9' : '#fff',
                          }}
                        >
                          <td style={{ padding: 8 }}>{row.annee}</td>
                          <td style={{ padding: 8 }}>{row.coutEdf} €</td>
                          <td style={{ padding: 8 }}>{row.prixEdfCts} cts</td>
                          <td
                            style={{
                              padding: 8,
                              color: solde > 0 ? '#dc2626' : '#10b981',
                              fontWeight: 900,
                            }}
                          >
                            {solde > 0
                              ? `-${solde.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })}`
                              : solde
                                  .toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                  })
                                  .replace('-', '')}{' '}
                            €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color: '#10b981',
                              fontWeight: 900,
                            }}
                          >
                            {(economieEDF + primeAnnee).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }
                            )}{' '}
                            €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color:
                                coutResiduelEDF > 0 ? '#dc2626' : '#10b981',
                              fontWeight: 900,
                            }}
                          >
                            {coutResiduelEDF > 0
                              ? coutResiduelEDF.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : '0'}{' '}
                            €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color: '#bfa100',
                              fontWeight: 900,
                            }}
                          >
                            {Number(gainRevente).toFixed(2)} €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color: '#0e7490',
                              fontWeight: 900,
                            }}
                          >
                            {totalEconomie.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}{' '}
                            €
                          </td>
                        </tr>
                      );
                    } else {
                      // Calcul du coût résiduel EDF annuel (avec augmentation si modeAugmentation)
                      let prixEdfBase = 0.25;
                      let prixEdfAnnee = modeAugmentation
                        ? prixEdfBase * Math.pow(1.05, i)
                        : prixEdfBase;
                      let residuelEDFAn =
                        consoNuitJour > capaciteBatterie
                          ? (consoNuitJour - capaciteBatterie) * 365
                          : 0;
                      let coutResiduelEDF = residuelEDFAn * prixEdfAnnee;
                      const diff =
                        row.coutEdf -
                        (row.coutCentrale || 0) -
                        coutResiduelEDF +
                        (row.reventeEstimee || 0);
                      return (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 === 0 ? '#f1f5f9' : '#fff',
                          }}
                        >
                          <td style={{ padding: 8 }}>{row.annee}</td>
                          <td style={{ padding: 8 }}>{row.coutEdf} €</td>
                          <td style={{ padding: 8 }}>{row.prixEdfCts} cts</td>
                          <td
                            style={{
                              padding: 8,
                              color: '#2563eb',
                              fontWeight: 900,
                            }}
                          >
                            {row.mensualiteEdf} €
                          </td>
                          <td style={{ padding: 8 }}>{row.coutCentrale} €</td>
                          <td
                            style={{
                              padding: 8,
                              color: '#2563eb',
                              fontWeight: 900,
                            }}
                          >
                            {row.mensualiteCentrale} €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color: '#bfa100',
                              fontWeight: 900,
                            }}
                          >
                            {Number(gainRevente).toFixed(2)} €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color:
                                coutResiduelEDF > 0 ? '#dc2626' : '#10b981',
                              fontWeight: 700,
                            }}
                          >
                            {coutResiduelEDF > 0
                              ? coutResiduelEDF.toLocaleString(undefined, {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : '0'}{' '}
                            €
                          </td>
                          <td
                            style={{
                              padding: 8,
                              color: typeof diff === 'number' && diff < 0 ? '#dc2626' : '#10b981',
                              fontWeight: 700,
                            }}
                          >
                            {typeof diff === 'number' && !isNaN(diff) ? diff.toFixed(2) : '-'} €
                          </td>
                        </tr>
                      );
                    }
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={paiementComptant ? 5 : 9}
                      style={{ textAlign: 'center', padding: 12 }}
                    >
                      Aucune donnée
                    </td>
                  </tr>
                )}
              </tbody>
              {rentabilite && rentabilite.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#fef9c3', fontWeight: 900 }}>
                    <td style={{ padding: 8 }}>Total 20 ans</td>
                    {/* Total coût EDF */}
                    <td style={{ padding: 8, color: '#dc2626', fontWeight: 900 }}>
                      {rentabilite
                        .reduce((acc, row) => acc + (row.coutEdf || 0), 0)
                        .toLocaleString()}{' '}
                      €
                    </td>
                    <td style={{ padding: 8 }}>-</td>
                    {/* Total retour sur investissement sur 20 ans (valeur finale en 2045) */}
                    <td style={{ padding: 8, color: '#10b981', fontWeight: 900 }}>
                      {paiementComptant && (() => {
                        let lastSolde = null;
                        let prixEdfBase = 0.25;
                        let consoReelle = conso ? Number(conso) : 0;
                        let solde = prixNet;
                        for (let i = 0; i < rentabilite.length; i++) {
                          let prixEdfAnnee = modeAugmentation
                            ? prixEdfBase * Math.pow(1.05, i)
                            : prixEdfBase;
                          let economieEDF = Math.min(prodMoyenneKwh, consoReelle) * prixEdfAnnee;
                          let primeAnnee = i === 1 ? prime : 0;
                          let revente = rentabilite[i].reventeEstimee || 0;
                          let residuelEDFAn = consoNuitJour > capaciteBatterie ? (consoNuitJour - capaciteBatterie) * 365 : 0;
                          let coutResiduelEDF = residuelEDFAn * prixEdfAnnee;
                          solde -= economieEDF + primeAnnee + revente - coutResiduelEDF;
                          lastSolde = solde;
                        }
                        return lastSolde !== null ? lastSolde.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace('-', '') + ' €' : '-';
                      })()}
                    </td>
                    {/* Cumul économies seul = coût total EDF - coût total centrale */}
                    <td style={{ padding: 8, color: '#10b981', fontWeight: 900, textAlign: 'center' }}>
                      {(() => {
                        const totalEdf = rentabilite.reduce((acc, row) => acc + (row.coutEdf || 0), 0);
                        const totalCentrale = rentabilite.reduce((acc, row) => acc + (row.coutCentrale || 0), 0);
                        const economies = totalEdf - totalCentrale;
                        return economies.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
                      })()}
                      <div style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>Cumul économies 20 ans</div>
                    </td>
                    {/* Cumul revente sur 20 ans */}
                    <td style={{ padding: 8, color: '#bfa100', fontWeight: 900, textAlign: 'center' }}>
                      {rentabilite.reduce((acc, row) => acc + (Number(row.reventeEstimee) || 0), 0).toLocaleString()} €
                      <div style={{ fontSize: 13, color: '#bfa100', fontWeight: 700 }}>Cumul revente 20 ans</div>
                    </td>
                    {/* Total économies EDF + Gains (tout en bas à droite) */}
                    <td style={{ padding: 8, color: '#0e7490', fontWeight: 900, textAlign: 'center' }}>
                      {(() => {
                        const totalEdf = rentabilite.reduce((acc, row) => acc + (row.coutEdf || 0), 0);
                        const totalCentrale = rentabilite.reduce((acc, row) => acc + (row.coutCentrale || 0), 0);
                        const economies = totalEdf - totalCentrale;
                        const revente = rentabilite.reduce((acc, row) => acc + (Number(row.reventeEstimee) || 0), 0);
                        const total = economies + revente;
                        return total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €';
                      })()}
                      <div style={{ fontSize: 13, color: '#0e7490', fontWeight: 700 }}>Total économies + revente</div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Boutons actions */}
          <div style={{ marginTop: 24, display: 'flex', gap: 18 }}>
            <button
              onClick={() => setShowClientModal(true)}
              style={{
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 32px',
                fontWeight: 800,
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              Assigner cette étude à un client
            </button>
            <button
              onClick={handleGeneratePDF}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 32px',
                fontWeight: 800,
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              Générer PDF récapitulatif
            </button>
            <button
              onClick={async () => await handleGeneratePDF(true)}
              style={{
                background: '#f59e42',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 32px',
                fontWeight: 800,
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              Aperçu PDF
            </button>
          </div>
        </div>
        {/* Colonne financement à droite */}
        <div
          style={{
            flex: 1,
            background: 'linear-gradient(120deg,#e0e7ff 60%,#f3f4f6 100%)',
            borderRadius: 32,
            boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
            padding: 48,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            minWidth: 340,
            maxWidth: 420,
            border: 'none',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <h3
            style={{
              color: '#3730a3',
              fontWeight: 900,
              fontSize: 28,
              marginBottom: 18,
              letterSpacing: 1,
              textShadow: '0 2px 8px #c7d2fe',
            }}
          >
            💸 Simulation financement
          </h3>
          {/* Bouton pour choisir le mode de paiement + toggle réinjection prime */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 18,
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setPaiementComptant(false)}
              style={{
                background: !paiementComptant ? '#6366f1' : '#e0e7ff',
                color: !paiementComptant ? '#fff' : '#6366f1',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: !paiementComptant ? '0 2px 8px #c7d2fe' : 'none',
              }}
            >
              Financement
            </button>
            <button
              onClick={() => setPaiementComptant(true)}
              style={{
                background: paiementComptant ? '#10b981' : '#e0e7ff',
                color: paiementComptant ? '#fff' : '#10b981',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: paiementComptant ? '0 2px 8px #a7f3d0' : 'none',
              }}
            >
              Paiement comptant
            </button>
            {/* ...rien ici, le bouton est déplacé au-dessus du tableau de rentabilité... */}
          </div>
          {/* Affichage conditionnel selon le mode de paiement */}
          {!paiementComptant ? (
            <>
              <div
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label
                  style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}
                >
                  Banque
                </label>
                <select
                  value={banque}
                  onChange={handleBanqueChange}
                >
                  {banques.map((bk) => (
                    <option key={bk.nom} value={bk.nom}>
                      {bk.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label
                  style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}
                >
                  Durée du financement :{' '}
                  <span style={{ color: '#6366f1', fontWeight: 900 }}>
                    {mois} mois
                  </span>
                </label>
                <input
                  type="range"
                  min={12}
                  max={dureeMax}
                  value={mois}
                  onChange={(e) => setMois(Number(e.target.value))}
                  style={{
                    width: '100%',
                    accentColor: '#6366f1',
                    height: 6,
                    borderRadius: 6,
                    background:
                      'linear-gradient(90deg,#6366f1 0%,#a5b4fc 100%)',
                    marginTop: 8,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    color: '#64748b',
                    marginTop: 2,
                  }}
                >
                  <span>12 mois</span>
                  <span>{dureeMax} mois</span>
                </div>
              </div>
              <div
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label
                  style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}
                >
                  Taux (%)
                </label>
                <input
                  type="number"
                  value={taux}
                  step={0.01}
                  min={0}
                  onChange={(e) => setTaux(Number(e.target.value))}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: '1.5px solid #6366f1',
                    fontSize: 16,
                    background: '#fff',
                    color: '#3730a3',
                    fontWeight: 700,
                    width: 120,
                    boxShadow: '0 2px 8px #e0e7ff',
                  }}
                />
              </div>
              <div
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label
                  style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}
                >
                  Apport personnel (€)
                </label>
                <input
                  type="number"
                  value={apport}
                  min={0}
                  onChange={(e) => setApport(Number(e.target.value))}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: '1.5px solid #6366f1',
                    fontSize: 16,
                    background: '#fff',
                    color: '#3730a3',
                    fontWeight: 700,
                    width: 160,
                    boxShadow: '0 2px 8px #e0e7ff',
                  }}
                />
              </div>
              <div
                style={{
                  marginBottom: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <label
                  style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}
                >
                  Montant à financer (€)
                </label>
                <input
                  type="number"
                  value={montantFinance}
                  min={0}
                  onChange={(e) => setMontantFinance(Number(e.target.value))}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: '1.5px solid #6366f1',
                    fontSize: 16,
                    background: '#fff',
                    color: '#3730a3',
                    fontWeight: 700,
                    width: 160,
                    boxShadow: '0 2px 8px #e0e7ff',
                  }}
                />
              </div>
              <div
                style={{
                  background: 'linear-gradient(90deg,#10b981 60%,#6ee7b7 100%)',
                  borderRadius: 16,
                  padding: 22,
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#065f46',
                  textAlign: 'center',
                  boxShadow: '0 2px 12px #a7f3d0',
                  marginTop: 8,
                  letterSpacing: 1,
                }}
              >
                Mensualité estimée&nbsp;:{' '}
                <span style={{ color: '#0e7490', fontWeight: 900 }}>
                  {mensualite} €
                </span>
              </div>
            </>
          ) : (
            <div
              style={{
                background: 'linear-gradient(90deg,#10b981 60%,#6ee7b7 100%)',
                borderRadius: 16,
                padding: 22,
                fontWeight: 900,
                fontSize: 22,
                color: '#065f46',
                textAlign: 'center',
                boxShadow: '0 2px 12px #a7f3d0',
                marginTop: 8,
                letterSpacing: 1,
              }}
            >
              Mode paiement comptant sélectionné
              <br />
              <span style={{ color: '#0e7490', fontWeight: 900 }}>
                Investissement initial : {prixNet} €
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Calculateur;
