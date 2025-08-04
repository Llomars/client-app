import axios from 'axios';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMapEvent } from 'react-leaflet';
import { db } from '../firebaseConfig';
// ...existing code...

// db est importé depuis firebaseConfig.js (déjà initialisé)

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function Calculateur() {
  // Tous les hooks doivent être appelés AVANT tout return ou condition !
  const [userRole, setUserRole] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  // ... tous les autres useState initiaux ...

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        const idToken = await u.getIdTokenResult();
        setUserRole(idToken.claims.role || null);
      } else {
        setUserRole(null);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // ... tous les autres useEffect initiaux ...

  // Contrôle d'accès APRÈS l'init des hooks
  if (!authChecked) return null;
  if (!["admin", "commercial", "manager"].includes(userRole)) {
    return <div style={{padding: 40, color: '#dc2626', fontWeight: 600}}>Accès réservé aux administrateurs, commerciaux et managers.</div>;
  }
  // Chargement de l'image Pétales.png en base64 pour le PDF
  useEffect(() => {
    if (!window.petalesPngDataUrl) {
      fetch('/Pétales.png')
        .then(res => res.blob())
        .then(blob => {
          const reader = new window.FileReader();
          reader.onloadend = () => {
            window.petalesPngDataUrl = reader.result;
          };
          reader.readAsDataURL(blob);
        });
    }
  }, []);
  // Chargement de l'image Backend.png en base64 pour le PDF
  useEffect(() => {
    if (!window.backendPngDataUrl) {
      fetch('/Backend2.png')
        .then(res => res.blob())
        .then(blob => {
          const reader = new window.FileReader();
          reader.onloadend = () => {
            window.backendPngDataUrl = reader.result;
          };
          reader.readAsDataURL(blob);
        });
    }
  }, []);
  // Chargement de l'image Backend.png en base64 pour le PDF
  useEffect(() => {
    if (!window.backendPngDataUrl) {
      fetch('/admin-dashboard/public/Backend.png')
        .then(res => res.blob())
        .then(blob => {
          const reader = new window.FileReader();
          reader.onloadend = () => {
            window.backendPngDataUrl = reader.result;
          };
          reader.readAsDataURL(blob);
        });
    }
  }, []);
  // Aperçu PDF
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Fonction pour générer le PDF récapitulatif (moderne et joli)
  const handleGeneratePDF = async (previewOnly = false) => {
    setPdfLoading(true);
    try {
      const docPdf = new jsPDF();
      // --- Ajout logo société en base64 (DataURL) ---
      const getBase64FromUrl = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Logo non trouvé');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new window.FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };
      let logoDataUrl = null;
      // Ajoute le logo en haut à gauche, taille réduite
      let logoWidth = 80;
      let logoHeight = 46;
      let logoX = 10;
      let logoY = 10;
      try {
        logoDataUrl = await getBase64FromUrl('/logopdf.png');
        docPdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight); // x, y, width, height
      } catch (e) {
        console.warn('[PDF] Logo non chargé ou format non supporté pour le PDF.', e);
      }
      // Tout le reste commence SOUS le logo (aucun chevauchement)

      // ... tous les éléments de la première page ...
      // Ajouter l'image Pétales.png en bas à droite de la première page (au tout dernier, pour être au premier plan, taille x2)
      if (window.petalesPngDataUrl) {
        docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
      }
      const yStart = logoY + logoHeight + 8; // 8px de marge sous le logo
      // Bandeau rose pastel subtil centré, opacité douce
      docPdf.setFillColor(255, 214, 224, 0.85); // Rose pastel très doux (rgba(255,214,224,0.85))
      docPdf.rect(0, yStart, 210, 14, 'F');
      docPdf.setDrawColor(255, 214, 224); // Contour rose pastel
      docPdf.setLineWidth(1.2);
      docPdf.rect(0, yStart, 210, 14);
      docPdf.setLineWidth(0.2);
      docPdf.setTextColor(255,255,255); // Texte blanc
      docPdf.setFontSize(20);
      docPdf.setFont('helvetica', 'bold');
      // Centrer le texte
      const title = 'Récapitulatif de votre projet photovoltaïque';
      const titleWidth = docPdf.getTextWidth(title);
      docPdf.text(title, (210 - titleWidth) / 2, yStart + 10);
      docPdf.setTextColor(0,0,0);
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(12);
      let y = yStart + 20;
      if (!kit || !conso || !prodMoyenneKwh) {
        docPdf.setTextColor(220,38,38);
        docPdf.text('Aucune donnée de simulation disponible.', 20, y);
      } else {
        // --- Présentation moderne, claire et cohérente DA Botaik ---
        // Bloc résumé (2 colonnes)
        const blockHeight = 36;
        const blockY = y;
        const colWidth = 90;
        // Colonne 1 : Votre projet
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(10, blockY, colWidth, blockHeight, 5, 5, 'F');
        docPdf.setDrawColor(0,0,0);
        docPdf.roundedRect(10, blockY, colWidth, blockHeight, 5, 5);
        // Colonne 2 : Financement
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(10+colWidth+10, blockY, colWidth, blockHeight, 5, 5, 'F');
        docPdf.setDrawColor(0,0,0);
        docPdf.roundedRect(10+colWidth+10, blockY, colWidth, blockHeight, 5, 5);
        // Titres colonnes
        docPdf.setFontSize(13);
        docPdf.setTextColor(30, 64, 175); // bleu foncé
        docPdf.text('Votre projet', 13, blockY+8);
        docPdf.text('Financement', 10+colWidth+13, blockY+8);
        // Données projet (alignées)
        docPdf.setFontSize(11);
        docPdf.setTextColor(30, 64, 175); // bleu foncé
        let projX = 13, projValX = 32, projY = blockY+15, projStep = 7;
        docPdf.text(`Kit :`, projX, projY);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${kit}`, projValX, projY);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Conso :`, projX, projY+projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${conso} kWh/an`, projValX, projY+projStep);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Production estimée :`, projX, projY+2*projStep);
        docPdf.setFont('helvetica', 'bold');
        // Décale la valeur plus à droite pour éviter la superposition
        docPdf.text(`${prodMoyenneKwh} kWh/an`, projValX + 18, projY+2*projStep);
        docPdf.setFont('helvetica', 'normal');
        // Données financement (alignées)
        docPdf.setTextColor(30, 64, 175); // bleu foncé
        let finX = 10+colWidth+13, finValX = 10+colWidth+38, finY = blockY+15;
        docPdf.text(`Banque :`, finX, finY);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${banque}`, finValX, finY);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Taux :`, finX, finY+projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${taux}%`, finValX, finY+projStep);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`Durée :`, finX, finY+2*projStep);
        docPdf.setFont('helvetica', 'bold');
        docPdf.text(`${mois} mois`, finValX, finY+2*projStep);
        docPdf.setFont('helvetica', 'normal');
        // Adresse juste avant la synthèse
        let synthY = blockY + blockHeight + 8;
        docPdf.setFontSize(11);
        docPdf.setTextColor(245, 158, 11);
        docPdf.text('Adresse :', 13, synthY);
        docPdf.setTextColor(0,0,0);
        docPdf.setFont('helvetica', 'bold');
        // Affichage de l'adresse complète sur plusieurs lignes si besoin
        docPdf.text(adresse ? adresse : '-', 32, synthY, { maxWidth: 160 });
        docPdf.setFont('helvetica', 'normal');
        synthY += 8;
        // Synthèse (juste sous l'adresse, occupe tout l'espace restant)
        // Calculs synthèse
        const cumulRevente = rentabilite.reduce((acc, row) => acc + (row.reventeEstimee || 0), 0);
        const totalEdfSynth = rentabilite.reduce((acc, row) => acc + (row.coutEdf || 0), 0);
        // Design amélioré synthèse
        const synthHeight = 277 - synthY;
        // Fond noir élégant
        // Fond image pour le bloc synthèse avec clipping arrondi sécurisé
        console.log('roundedRect args:', 10, synthY, 190, synthHeight, 14, 14);
        if (
          typeof synthY === 'number' && !isNaN(synthY) &&
          typeof synthHeight === 'number' && !isNaN(synthHeight)
        ) {
          if (window.backendPngDataUrl) {
            docPdf.saveGraphicsState();
            docPdf.setDrawColor(0, 0, 0);
            docPdf.setLineWidth(4);
            docPdf.rect(10, synthY, 190, synthHeight, 'S');
            docPdf.rect(10, synthY, 190, synthHeight);
            docPdf.clip();
            docPdf.addImage(window.backendPngDataUrl, 'PNG', 10, synthY, 190, synthHeight);
            docPdf.restoreGraphicsState();
            docPdf.setLineWidth(0.2);
          } else {
            docPdf.setFillColor(255,255,255);
            docPdf.rect(10, synthY, 190, synthHeight, 'F');
          }
        } else {
          // fallback : fond blanc simple si problème de coordonnées
          docPdf.setFillColor(255,255,255);
          docPdf.rect(10, 40, 190, 100, 'F');
        }
        // Titre synthèse modernisé
        docPdf.setFontSize(18);
        docPdf.setTextColor(255,255,255); // blanc
        docPdf.setFont('helvetica', 'bold');
        docPdf.text('SYNTHÈSE', 18, synthY+20);
        // Séparateur
        docPdf.setDrawColor(80, 80, 80);
        docPdf.setLineWidth(0.5);
        docPdf.line(18, synthY+24, 190, synthY+24);
        // Blocs valeurs stylés
        // 2 colonnes x 2 lignes pour occuper tout l'espace
        // Espacement augmenté et style plus impactant
        const blockW = 78, blockH = 24, blockR = 9;
        const blockGap = 10;
        const col1X = 22, col2X = col1X + blockW + blockGap;
        let rowY = synthY+34, rowGap = blockH + blockGap;
        // Prime (col1, row1)
        // Bloc 1 : Prime
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR, 'F');
        // Ombre légère
        // Suppression de l'ombre pour un contour net et aligné
        // Contour rose pastel épais
        docPdf.setDrawColor(0, 0, 0); // noir
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Prime', col1X + blockW/2, rowY+10, { align: 'center' });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        docPdf.text(`${prime} €`, col1X + blockW/2, rowY+16, { align: 'center' });
        // Cumul revente EDF (col2, row1)
        docPdf.setFont('helvetica', 'normal');
        // Bloc 2 : Cumul revente EDF
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR, 'F');
        // Suppression de l'ombre pour un contour net et aligné
        docPdf.setDrawColor(0, 0, 0); // noir
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(191, 161, 0); // doré
        docPdf.text('Cumul revente EDF', col2X + blockW/2, rowY+10, { align: 'center' });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        docPdf.text(`${cumulRevente} €`, col2X + blockW/2, rowY+16, { align: 'center' });
        // Économie totale (col1, row2)
        rowY += rowGap;
        docPdf.setFont('helvetica', 'normal');
        // Bloc 3 : Économie totale
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR, 'F');
        // Suppression de l'ombre pour un contour net et aligné
        docPdf.setDrawColor(0, 0, 0); // noir
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col1X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(16, 185, 129); // vert
        docPdf.text('Économie totale', col1X + blockW/2, rowY+10, { align: 'center' });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        docPdf.setTextColor(16, 185, 129);
        docPdf.text(`${totalDiff ? totalDiff + ' €' : '-'}`, col1X + blockW/2, rowY+16, { align: 'center' });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(99, 102, 241);
        docPdf.text('Cumul location EDF', col2X + blockW/2, rowY+10, { align: 'center' });
        docPdf.setFont('helvetica', 'normal');
        // Bloc 4 : Cumul location EDF
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR, 'F');
        // Suppression de l'ombre pour un contour net et aligné
        docPdf.setDrawColor(0, 0, 0); // noir
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(col2X, rowY, blockW, blockH, blockR, blockR);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(13);
        docPdf.setTextColor(220,38,38);
        docPdf.text('Cumul location EDF', col2X + blockW/2, rowY+10, { align: 'center' });
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(16);
        docPdf.text(`${totalEdfSynth} €`, col2X + blockW/2, rowY+16, { align: 'center' });
        // ...
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(11);


        // Ajouter l'image Pétales.png en bas à droite de la première page (au tout dernier, pour être au premier plan, taille x2)
        if (window.petalesPngDataUrl) {
          docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
        }
        // Nouvelle page : tableau de rentabilité complet (20 ans)
        docPdf.addPage();
        // Ajouter l'image Pétales.png en bas à droite de la 2e page (au premier plan, taille x2)
        if (window.petalesPngDataUrl) {
          docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
        }
        docPdf.setFontSize(13);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Tableau de rentabilité complet (20 ans)', 15, 20);
        docPdf.setFontSize(10);
        docPdf.setTextColor(0,0,0);
        // En-têtes
        const tableY2 = 28;
        docPdf.setFillColor(255,255,255);
        docPdf.rect(10, tableY2, 190, 7, 'F');
        docPdf.setDrawColor(0,0,0);
        docPdf.rect(10, tableY2, 190, 7);
        docPdf.setTextColor(30, 64, 175);
        docPdf.text('Année', 12, tableY2+5);
        docPdf.text('Coût EDF', 28, tableY2+5);
        docPdf.text('Coût centrale', 52, tableY2+5);
        docPdf.text('Revente', 82, tableY2+5);
        docPdf.text('Éco.', 108, tableY2+5);
        docPdf.text('Mens. EDF', 132, tableY2+5);
        docPdf.text('Mens. centrale', 160, tableY2+5);
        // Lignes (20 années)
        let rowY2 = tableY2+7;
        for (let i = 0; i < rentabilite.length; i++) {
          const row = rentabilite[i];
          docPdf.setTextColor(0,0,0);
          docPdf.text(`${row.annee}`.slice(-2), 12, rowY2+5);
          docPdf.text(`${row.coutEdf} €`, 28, rowY2+5);
          docPdf.text(`${row.coutCentrale} €`, 52, rowY2+5);
          docPdf.setTextColor(191, 161, 0);
          docPdf.text(`${row.reventeEstimee} €`, 82, rowY2+5);
          docPdf.setTextColor(16, 185, 129);
          docPdf.text(`${row.diff} €`, 108, rowY2+5);
          docPdf.setTextColor(30, 64, 175);
          docPdf.text(`${row.mensualiteEdf} €`, 132, rowY2+5);
          docPdf.text(`${row.mensualiteCentrale} €`, 160, rowY2+5);
          rowY2 += 7;
        }
        // Totaux (alignés, sans chevauchement ni slash)
        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(202, 138, 4);
        rowY2 += 20; // encore plus d'espace pour éviter tout chevauchement
        // Ligne totaux : toutes les valeurs totales, sans le label
        const totalRevente = rentabilite.reduce((acc, row) => acc + (row.reventeEstimee || 0), 0);
        const totalEdf = rentabilite.reduce((acc, row) => acc + (row.coutEdf || 0), 0);
        const totalCentrale = rentabilite.reduce((acc, row) => acc + (row.coutCentrale || 0), 0);
        const mensualiteEdfTotal = rentabilite.reduce((acc, row) => acc + (row.mensualiteEdf || 0), 0);
        const mensualiteCentraleTotal = rentabilite.reduce((acc, row) => acc + (row.mensualiteCentrale || 0), 0);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(30, 64, 175);
        docPdf.text(`${String(totalEdf).replace(/\//g, '')} €`, 28, rowY2+5);
        docPdf.text(`${String(totalCentrale).replace(/\//g, '')} €`, 52, rowY2+5);
        docPdf.setTextColor(191, 161, 0);
        docPdf.text(`${String(totalRevente).replace(/\//g, '')} €`, 82, rowY2+5);
        docPdf.setTextColor(16, 185, 129);
        docPdf.text(`${totalDiff ? String(totalDiff).replace(/\//g, '') + ' €' : '-'}`, 108, rowY2+5);
        // On n'affiche rien pour Mens EDF et Mens centrale sur la ligne des totaux
        // Message rassurant sous le tableau
        let msgY = rowY2+18;
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(12);
        docPdf.setTextColor(30, 64, 175); // bleu foncé
        docPdf.text('Votre projet solaire est étudié pour maximiser vos économies et votre autonomie.', 15, msgY);
        docPdf.setTextColor(99, 102, 241); // bleu clair
        docPdf.text('Nos équipes restent à votre écoute pour toute question ou adaptation de votre projet.', 15, msgY+6);

        // --- PAGE 3 : Conseils, Contact, Graphique ---

        docPdf.addPage();
        // Bandeau pastel titre
        docPdf.setFillColor(255, 214, 224, 0.85);
        docPdf.rect(0, 10, 210, 16, 'F');
        docPdf.setDrawColor(255, 214, 224);
        docPdf.setLineWidth(1.2);
        docPdf.rect(0, 10, 210, 16);
        docPdf.setLineWidth(0.2);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(20);
        docPdf.setTextColor(255,255,255); // Texte blanc
        const titre3 = 'Conseils, Astuces & Contact';
        const titre3Width = docPdf.getTextWidth(titre3);
        docPdf.text(titre3, (210-titre3Width)/2, 22);

        // --- Bloc Conseils & Astuces ---
        // Fond rose pastel
        docPdf.setFillColor(255, 214, 224);
        docPdf.setDrawColor(0, 0, 0); // contour noir
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(12, 30, 185, 58, 10, 10, 'F');
        // Ajout du contour noir après le fond
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(12, 30, 185, 58, 10, 10);
        // Texte
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(15);
        docPdf.setTextColor(255,255,255);
        docPdf.text('Conseils & Astuces', 20, 44);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(12);
        docPdf.setTextColor(255,255,255);
        const conseils = [
          "• Surveillez votre production via l'application dédiée.",
          "• Nettoyez les panneaux 1-2x/an pour optimiser le rendement.",
          "• Privilégiez l'autoconsommation en journée.",
          "• Pensez à adapter vos usages (lave-linge, chauffe-eau) aux heures solaires.",
          "• Contactez-nous pour toute question technique ou administrative."
        ];
        let conseilY = 54;
        conseils.forEach(c => {
          docPdf.text(c, 22, conseilY);
          conseilY += 6;
        });

        // --- Bloc Contact Botaik ---
        const contactY = 30+58+12;
        docPdf.setFillColor(255, 214, 224); // même rose pastel
        docPdf.setDrawColor(0, 0, 0); // contour noir
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(12, contactY, 185, 42, 10, 10, 'F');
        // Ajout du contour noir après le fond
        docPdf.setDrawColor(0, 0, 0);
        docPdf.setLineWidth(1.1);
        docPdf.roundedRect(12, contactY, 185, 42, 10, 10);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(15);
        docPdf.setTextColor(255,255,255);
        docPdf.text('Contact Botaik', 20, contactY+14);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(12);
        docPdf.setTextColor(255,255,255);
        docPdf.text('Site : www.Botaik.re', 20, contactY+22);
        docPdf.text('Mail : contact@botaik.re', 20, contactY+28);
        docPdf.text('Tel : 0262 00 00 00', 20, contactY+34);
        docPdf.setFontSize(10);
        docPdf.setTextColor(255,255,255);
        docPdf.text('Suivi, conseils, SAV : notre équipe vous accompagne !', 20, contactY+40, { maxWidth: 170 });

        // QR code du site internet (généré via API)
        try {
          const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=https://botaik.re';
          const qrResp = await fetch(qrUrl);
          const qrBlob = await qrResp.blob();
          const qrReader = new window.FileReader();
          const qrPromise = new Promise(resolve => {
            qrReader.onloadend = () => resolve(qrReader.result);
          });
          qrReader.readAsDataURL(qrBlob);
          const qrDataUrl = await qrPromise;
          docPdf.addImage(qrDataUrl, 'PNG', 170, contactY+10, 22, 22);
        } catch (e) {}

        // --- Graphique comparatif prix centrale VS EDF sur 20 ans (bar chart) ---
        // Graphique harmonisé, espacé, lisible, sans superposition
        const graphX = 28, graphY = contactY+42+18, graphW = 154, graphH = 80;
        // Fond blanc
        docPdf.setFillColor(255,255,255);
        docPdf.roundedRect(graphX-8, graphY-10, graphW+16, graphH+20, 12, 12, 'F');
        // Cadre gris clair
        docPdf.setDrawColor(230,230,230);
        docPdf.setLineWidth(1.2);
        docPdf.roundedRect(graphX-8, graphY-10, graphW+16, graphH+20, 12, 12);
        // Axes fins
        docPdf.setDrawColor(180,180,180);
        docPdf.setLineWidth(0.8);
        docPdf.line(graphX, graphY, graphX, graphY+graphH);
        docPdf.line(graphX, graphY+graphH, graphX+graphW, graphY+graphH);
        // Graduation Y
        docPdf.setFontSize(9);
        docPdf.setTextColor(120,120,120);
        if (rentabilite && rentabilite.length > 0) {
          const allVals = [ ...rentabilite.map(r => r.coutEdf), ...rentabilite.map(r => r.coutCentrale) ];
          const minY = Math.min(...allVals);
          const maxY = Math.max(...allVals);
          const yRange = maxY - minY || 1;
          for (let t = 0; t <= 4; t++) {
            const val = Math.round(minY + (yRange * (4-t)/4));
            const y = graphY + (graphH * t/4);
            docPdf.text(String(val), graphX-10, y+3, { align: 'right' });
            // Lignes de fond
            docPdf.setDrawColor(245,245,245);
            docPdf.setLineWidth(0.4);
            docPdf.line(graphX, y, graphX+graphW, y);
          }
        }
        // Labels axes
        docPdf.setFontSize(11);
        docPdf.setTextColor(90,90,90);
        docPdf.text('€', graphX-14, graphY+8);
        docPdf.text('Années', graphX+graphW-28, graphY+graphH+14);
        // Barres espacées, douces, arrondies
        if (rentabilite && rentabilite.length > 0) {
          const allVals = [ ...rentabilite.map(r => r.coutEdf), ...rentabilite.map(r => r.coutCentrale) ];
          const minY = Math.min(...allVals);
          const maxY = Math.max(...allVals);
          const yRange = maxY - minY || 1;
          const paddingLeft = 16;
          const paddingRight = 16;
          const availableW = graphW - paddingLeft - paddingRight;
          const groupW = availableW / rentabilite.length;
          const barGap = Math.max(4, groupW * 0.32);
          const barW = Math.max(6, (groupW - barGap) / 2);
          for (let i = 0; i < rentabilite.length; i++) {
            const r = rentabilite[i];
            const groupX = graphX + paddingLeft + i * groupW;
            // --- EDF (rose, arrière-plan) ---
            const edfY = graphY + graphH - ((r.coutEdf - minY) / yRange) * graphH;
            docPdf.setFillColor(255, 99, 132);
            docPdf.roundedRect(groupX, edfY, barW, graphY + graphH - edfY, 3, 3, 'F');
            // Label valeur EDF
            docPdf.setFontSize(8);
            docPdf.setTextColor(220, 38, 38);
            docPdf.text(String(r.coutEdf), groupX + barW / 2, edfY - 2, { align: 'center' });
            // --- Centrale (vert, avant-plan, même X, par-dessus) ---
            const centraleY = graphY + graphH - ((r.coutCentrale - minY) / yRange) * graphH;
            docPdf.setFillColor(102, 205, 170);
            docPdf.roundedRect(groupX, centraleY, barW, graphY + graphH - centraleY, 3, 3, 'F');
            // Contour noir pour la barre centrale
            docPdf.setDrawColor(0,0,0);
            docPdf.setLineWidth(0.7);
            docPdf.roundedRect(groupX, centraleY, barW, graphY + graphH - centraleY, 3, 3);
            docPdf.setLineWidth(0.2);
            // Label valeur Centrale
            docPdf.setFontSize(8);
            docPdf.setTextColor(16, 185, 129);
            docPdf.text(String(r.coutCentrale), groupX + barW / 2, centraleY - 2, { align: 'center' });
            // Label année sous le groupe
            docPdf.setFontSize(8);
            docPdf.setTextColor(90,90,90);
            docPdf.text(String(r.annee).slice(-2), groupX + barW / 2, graphY + graphH + 7, { align: 'center' });
          }
          // Légende claire
          const legendY = graphY + graphH + 20;
          docPdf.setFontSize(10);
          // Pastille rouge pastel
          docPdf.setFillColor(255, 99, 132);
          docPdf.circle(graphX + 10, legendY, 3, 'F');
          docPdf.setTextColor(220, 38, 38);
          docPdf.text('EDF', graphX + 16, legendY + 2);
          // Pastille verte pastel
          docPdf.setFillColor(102, 205, 170);
          docPdf.circle(graphX + 38, legendY, 3, 'F');
          docPdf.setTextColor(16, 185, 129);
          docPdf.text('Centrale', graphX + 44, legendY + 2);
        }

        // Image Pétales.png en bas à droite, au premier plan
        if (window.petalesPngDataUrl) {
          docPdf.addImage(window.petalesPngDataUrl, 'PNG', 120, 235, 90, 60);
        }
      }
      // Aperçu ou téléchargement
      if (previewOnly) {
        const pdfDataUrl = docPdf.output('datauristring');
        setPdfUrl(pdfDataUrl);
        setPdfLoading(false);
        setShowPdfPreview(true);
      } else {
        setPdfLoading(false);
        docPdf.save('simulation-photovoltaique.pdf');
      }
    } catch (err) {
      setPdfLoading(false);
      console.error('Erreur génération PDF:', err);
      alert('Erreur lors de la génération du PDF. Voir la console pour plus de détails.');
    }
  };
  // ...existing code...
  // Année courante
  const currentYear = new Date().getFullYear();
  // Données banques
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
  // Apport personnel
  const [apport, setApport] = useState(0);
  // Production PV annuelle estimée
  const [prodMoyenneKwh, setProdMoyenneKwh] = useState(0);
  // Modale assignation client
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchClient, setSearchClient] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [assignStatus, setAssignStatus] = useState('');
  // Mapping orientation -> azimut PVGIS (aspect entre -180 et 180)
   const orientationAzimut = {
       'Sud': 0,
       'Sud-Est': -45,
       'Est': -90,
       'Nord-Est': -135,
       'Nord': 180,
       'Nord-Ouest': 135,
       'Ouest': 90,
       'Sud-Ouest': 45
   };
  // Liste des kits avec variantes, prix et primes
  const [kit, setKit] = useState('');
  const [conso, setConso] = useState('');
  const [prixCentrale, setPrixCentrale] = useState(0);
  const [prixNet, setPrixNet] = useState(0);
  const [remise, setRemise] = useState(0);
  const [montantFinance, setMontantFinance] = useState(0);
  // Prix et primes à jour (exemple, à adapter si besoin)
  const kits = [
    { label: '3 KWh 0', value: '3KWh-0', prix: 7500, prime: 4830 },
    { label: '3 KWh 1', value: '3KWh-1', prix: 9500, prime: 4830 },
    { label: '6 KWh 0', value: '6KWh-0', prix: 12000, prime: 5760 },
    { label: '6 KWh 1', value: '6KWh-1', prix: 15000, prime: 5760 },
    { label: '6 KWh 2', value: '6KWh-2', prix: 16000, prime: 5760 },
    { label: '9 KWh 0', value: '9KWh-0', prix: 16500, prime: 8640 },
    { label: '9 KWh 1', value: '9KWh-1', prix: 22000, prime: 8640 },
    { label: '9 KWh 2', value: '9KWh-2', prix: 24000, prime: 8640 },
    { label: '12 KWh 0', value: '12KWh-0', prix: 22000, prime: 6840 },
    { label: '12 KWh 2', value: '12KWh-2', prix: 30000, prime: 6840 },
  ];
  const [inclinaison, setInclinaison] = useState(20); // valeur par défaut
  const [orientation, setOrientation] = useState('Sud');
  const [adresse, setAdresse] = useState('');
  const [loadingAdresse, setLoadingAdresse] = useState(false);
  const [coords, setCoords] = useState({ lat: -21.1151, lng: 55.5364 }); // Centre Réunion
  const [adresseError, setAdresseError] = useState('');
  const [banque, setBanque] = useState(banques[0].nom);
  const [taux, setTaux] = useState(banques[0].taux);
  const [dureeMax, setDureeMax] = useState(banques[0].dureeMax);
  const [mois, setMois] = useState(banques[0].dureeMax);
  const [prime, setPrime] = useState(0);
  const [gainRevente, setGainRevente] = useState(0);
  const [eco, setEco] = useState(0);
  const [rentabilite, setRentabilite] = useState([]);
  const [loadingPVGIS, setLoadingPVGIS] = useState(false);
  const [pvError, setPvError] = useState('');

  // --- Variables calculées pour le financement ---
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
  // Permet de placer le marqueur sur la carte au clic
  function MapClickHandler() {
    useMapEvent('click', async (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setCoords({ lat, lng });
      // Reverse geocoding OpenStreetMap Nominatim
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`);
        if (res.data && res.data.display_name) {
          setAdresse(res.data.display_name);
          setAdresseError('');
        } else {
          setAdresse('');
          setAdresseError("Adresse non trouvée");
        }
      } catch (err) {
        setAdresse('');
        setAdresseError("Erreur lors de la récupération de l'adresse");
      }
    });
    return null;
  }
  // ...existing code...

  // Met à jour prix centrale, prix net, montant à financer, prime et gain revente (surplus, bon tarif) quand kit/remise change
  useEffect(() => {
    const kitObj = kits.find(k => k.value === kit);
    if (kitObj) {
      setPrixCentrale(kitObj.prix);
      setPrixNet(kitObj.prix - remise);
      setMontantFinance(kitObj.prix - remise - apport);
      setPrime(kitObj.prime);
      // Estimation revente annuelle sur le surplus, au bon tarif
      let prixRevente = 0.1741;
      if (kit && kit.startsWith('12KWh')) prixRevente = 0.0894;
      let surplus = prodMoyenneKwh && conso ? prodMoyenneKwh - Number(conso) : 0;
      if (surplus < 0) surplus = 0;
      setGainRevente(surplus ? (surplus * prixRevente).toFixed(0) : 0);
    } else {
      setPrixCentrale(0);
      setPrixNet(0);
      setMontantFinance(0);
      setPrime(0);
      setGainRevente(0);
    }
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
    const prixEdfBase = 0.22; // €/kWh (tarif Réunion 2025)
    let prixEdf = prixEdfBase;
    const rows = [];
    // Détermine le prix de revente selon le kit
    let prixRevente = 0.1741; // défaut 3,6,9kW
    if (kit.startsWith('12KWh')) prixRevente = 0.0894;
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
      const mensualiteEdf = (conso * prixEdf / 12).toFixed(2);
      // Mensualité centrale = mensualitéCourante si remboursement, sinon 0
      let mensualiteCentrale = 0;
      // Si encore en remboursement
      if (moisRestant > 0) {
        // À partir de la 2e année, on déduit la prime du solde restant (une seule fois)
        if (i === 1 && prime && !primeUtilisee) {
          montantRestant = Math.max(0, montantRestant - prime);
          // Recalcule la mensualité sur le solde restant et la durée restante
          const t = tauxRestant / 100 / 12;
          if (t === 0) {
            mensualiteCourante = moisRestant ? (montantRestant / moisRestant).toFixed(2) : '0.00';
          } else {
            mensualiteCourante = moisRestant ? ((montantRestant * t) / (1 - Math.pow(1 + t, -moisRestant))).toFixed(2) : '0.00';
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
      // Revente estimée annuelle sur le surplus (production - conso)
      let surplus = prodMoyenneKwh && conso ? prodMoyenneKwh - Number(conso) : 0;
      if (surplus < 0) surplus = 0;
      const reventeEstimee = surplus ? (surplus * prixRevente).toFixed(0) : 0;
      rows.push({
        annee,
        coutEdf: Number(coutEdf),
        coutCentrale: Number(coutCentrale),
        prixEdfCts: (prixEdf * 100).toFixed(1),
        reventeEstimee: Number(reventeEstimee),
        diff: Number(coutEdf) - Number(coutCentrale),
        mensualiteEdf,
        mensualiteCentrale
      });
      prixEdf *= 1.05;
    }
    setRentabilite(rows);
  }, [prodMoyenneKwh, conso, prixNet, mensualite, mois, montantFinance, tauxEffectif, prime, kit]);
  // ...existing code...

  // Met à jour taux/durée max quand banque change
  const handleBanqueChange = e => {
    const b = banques.find(bk => bk.nom === e.target.value);
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
        // Utilise le proxy local en dev, sinon la serverless function Vercel
        let proxyUrl = '/api/pvgis';
        // On passe les paramètres en query string
        const urlObj = new URL(url);
        proxyUrl += `?lat=${urlObj.searchParams.get('lat')}`;
        proxyUrl += `&lon=${urlObj.searchParams.get('lon')}`;
        proxyUrl += `&puissance=${urlObj.searchParams.get('peakpower')}`;
        proxyUrl += `&angle=${urlObj.searchParams.get('angle')}`;
        proxyUrl += `&azimut=${urlObj.searchParams.get('aspect')}`;
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
          proxyUrl = '/api/pvgis';
          const urlObj2 = new URL(url);
          proxyUrl += `?lat=${urlObj2.searchParams.get('lat')}`;
          proxyUrl += `&lon=${urlObj2.searchParams.get('lon')}`;
          proxyUrl += `&puissance=${urlObj2.searchParams.get('peakpower')}`;
          proxyUrl += `&angle=${urlObj2.searchParams.get('angle')}`;
          proxyUrl += `&azimut=${urlObj2.searchParams.get('aspect')}`;
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
              else if (typeof err2.response.data === 'string') msg = err2.response.data;
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
  const diffArray = rentabilite ? rentabilite.map(row => row.coutEdf - (row.coutCentrale || 0)) : [];
  const totalDiff = diffArray.reduce((acc, v) => acc + v, 0);
  // Calcul de l'année de rentabilité (première année où diff > 0)
  const anneeRentable = rentabilite.find(row => (row.coutEdf - (row.coutCentrale || 0)) > 0);
  const nbAnneesRentable = anneeRentable ? (anneeRentable.annee - currentYear + 1) : null;

  // Always call hooks at the top level
  useEffect(() => {
    if (showClientModal && clientResults.length === 0 && !loadingClients) {
      setLoadingClients(true);
      getDocs(collection(db, 'clients')).then(snap => {
        const results = [];
        snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
        setClientResults(results);
      }).catch(() => setAssignStatus('Erreur Firestore.')).finally(() => setLoadingClients(false));
    }
    // eslint-disable-next-line
  }, [showClientModal]);

  // Modale de sélection client (injectée dans le JSX principal)
  let clientModal = null;
  if (showClientModal) {
    clientModal = (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,41,59,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(99,102,241,0.18)', padding: 36, minWidth: 380, maxWidth: 480, position: 'relative' }}>
          <button onClick={() => { setShowClientModal(false); setAssignStatus(''); setClientResults([]); setSearchClient(''); setSelectedClient(null); }} style={{ position: 'absolute', top: 12, right: 18, background: 'none', border: 'none', fontSize: 22, color: '#6366f1', cursor: 'pointer' }}>×</button>
          <h3 style={{ color: '#3730a3', fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Assigner à un client CRM</h3>
          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Recherche nom ou email..."
              value={searchClient}
              onChange={e => setSearchClient(e.target.value)}
              style={{ width: '100%', borderRadius: 8, border: '1.5px solid #c7d2fe', padding: 10, fontSize: 16, marginBottom: 8 }}
            />
            <button
              onClick={async () => {
                setLoadingClients(true);
                setAssignStatus('');
                let results = [];
                if (searchClient.trim() === '') {
                  // Si pas de recherche, on recharge tous les clients
                  const snap = await getDocs(collection(db, 'clients'));
                  snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
                } else {
                  // Recherche par nom ou email
                  const snap = await getDocs(collection(db, 'clients'));
                  snap.forEach(doc => {
                    const data = doc.data();
                    if ((data.nom && data.nom.toLowerCase().includes(searchClient.toLowerCase())) || (data.email && data.email.toLowerCase().includes(searchClient.toLowerCase()))) {
                      results.push({ id: doc.id, ...data });
                    }
                  });
                }
                setClientResults(results);
                if (results.length === 0) setAssignStatus('Aucun client trouvé.');
                setLoadingClients(false);
              }}
              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 16, marginBottom: 4, cursor: 'pointer' }}
            >Rechercher</button>
          </div>
          {loadingClients && <div style={{ color: '#6366f1', marginBottom: 8 }}>Chargement...</div>}
          {clientResults.length > 0 && (
            <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 10, border: '1px solid #e0e7ff', borderRadius: 8 }}>
              {clientResults.map(c => (
                <div key={c.id} style={{ padding: 8, borderBottom: '1px solid #e0e7ff', cursor: 'pointer', background: selectedClient && selectedClient.id === c.id ? '#e0e7ff' : '#fff' }}
                  onClick={() => setSelectedClient(c)}
                >
                  <b>{c.nom || c.email}</b> <span style={{ color: '#64748b', fontSize: 14 }}>{c.email}</span>
                </div>
              ))}
            </div>
          )}
          {selectedClient && (
            <button
              style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, fontSize: 16, marginTop: 10, cursor: 'pointer' }}
              onClick={async () => {
                setAssignStatus('Enregistrement...');
                // Prépare l'étude à sauvegarder
                const etude = {
                  date: new Date().toISOString(),
                  conso, kit, inclinaison, orientation, adresse, coords,
                  prixCentrale, prixNet, remise, apport, montantFinance,
                  banque, taux, mois, mensualite,
                  prodMoyenneKwh, prime, gainRevente, eco,
                  rentabilite, totalDiff, nbAnneesRentable, anneeRentable: anneeRentable?.annee || null
                };
                try {
                  const ref = doc(db, 'clients', selectedClient.id);
                  await updateDoc(ref, {
                    etudeCalculateur: etude
                  });
                  setAssignStatus('Étude assignée au client !');
                } catch (e) {
                  setAssignStatus('Erreur lors de l\'enregistrement.');
                }
              }}
            >Assigner à ce client</button>
          )}
          {assignStatus && <div style={{ marginTop: 12, color: assignStatus.includes('Erreur') ? '#dc2626' : '#10b981', fontWeight: 700 }}>{assignStatus}</div>}
        </div>
      </div>
    );
  }

  // --- Rendu principal ---
  return (
    <>
      {/* Aperçu PDF modal */}
      {showPdfPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,41,59,0.18)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(99,102,241,0.18)', padding: 36, minWidth: 480, maxWidth: 900, position: 'relative', minHeight: 600 }}>
            <button onClick={() => { setShowPdfPreview(false); setPdfUrl(null); }} style={{ position: 'absolute', top: 12, right: 18, background: 'none', border: 'none', fontSize: 22, color: '#6366f1', cursor: 'pointer' }}>×</button>
            <h3 style={{ color: '#3730a3', fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Aperçu PDF à envoyer au client</h3>
            {pdfLoading ? (
              <div style={{ textAlign: 'center', color: '#6366f1', fontWeight: 700, fontSize: 18, marginTop: 80 }}>Chargement du PDF...</div>
            ) : pdfUrl ? (
              <iframe src={pdfUrl} title='Aperçu PDF' style={{ width: '100%', height: 500, border: '1.5px solid #e0e7ff', borderRadius: 12 }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700, fontSize: 18, marginTop: 80 }}>Aucun PDF à afficher.</div>
            )}
            <div style={{ marginTop: 18, display: 'flex', gap: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowPdfPreview(false); setPdfUrl(null); }} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Fermer</button>
              <button onClick={() => { setShowPdfPreview(false); handleGeneratePDF(false); }} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Télécharger PDF</button>
            </div>
          </div>
        </div>
      )}
      {clientModal}
      <div style={{ display: 'flex', gap: 40, padding: 40, minHeight: '100vh', background: 'linear-gradient(120deg,#f3f4f6 60%,#c7d2fe 100%)' }}>
        {/* Colonne principale infos centrale/client */}
        <div style={{ flex: 2, background: 'rgba(255,255,255,0.98)', borderRadius: 24, boxShadow: '0 8px 32px rgba(99,102,241,0.10)', padding: 48, display: 'flex', flexDirection: 'column', gap: 32, border: '1.5px solid #e0e7ff' }}>
          <h2 style={{ color: '#3730a3', fontWeight: 900, fontSize: 28, marginBottom: 18 }}>Simulation centrale photovoltaïque</h2>
          {/* Bloc moderne de saisie des paramètres */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 28,
            background: 'linear-gradient(90deg,#e0e7ff 60%,#f3f4f6 100%)',
            borderRadius: 18,
            padding: 32,
            boxShadow: '0 2px 12px #c7d2fe',
            marginBottom: 8,
            alignItems: 'center',
            border: '1.5px solid #c7d2fe'
          }}>
            {/* Kit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#6366f1', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
                <span role="img" aria-label="Kit">🔋</span> Kit
              </label>
              <select value={kit} onChange={e => setKit(e.target.value)} style={{
                padding: 12,
                borderRadius: 10,
                border: '2px solid #6366f1',
                fontSize: 16,
                background: '#fff',
                color: '#3730a3',
                fontWeight: 700,
                boxShadow: '0 2px 8px #e0e7ff',
                outline: 'none',
                transition: 'border 0.2s'
              }}>
                <option value=''>Sélectionner un kit</option>
                {kits.map(k => (
                  <option key={k.value} value={k.value}>{k.label} ({k.prix} €)</option>
                ))}
              </select>
            </div>
            {/* Consommation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#6366f1', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
                <span role="img" aria-label="Conso">⚡️</span> Consommation annuelle (kWh)
              </label>
              <input type='number' value={conso} onChange={e => setConso(e.target.value)} placeholder='ex: 3500' style={{
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
                transition: 'border 0.2s'
              }} />
            </div>
          {/* Inclinaison */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: '#6366f1', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
              <span role="img" aria-label="Inclinaison">📐</span> Inclinaison (°)
            </label>
            <input type='number' value={inclinaison} min={0} max={90} onChange={e => setInclinaison(Number(e.target.value))} style={{
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
              transition: 'border 0.2s'
            }} />
          </div>
          {/* Remise */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: '#6366f1', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
              <span role="img" aria-label="Remise">💸</span> Remise (€)
            </label>
            <input type='number' value={remise} min={0} max={prixCentrale} onChange={e => setRemise(Number(e.target.value))} placeholder='ex: 500' style={{
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
              transition: 'border 0.2s'
            }} />
          </div>
            {/* Orientation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#6366f1', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
                <span role="img" aria-label="Orientation">🧭</span> Orientation
              </label>
              <select value={orientation} onChange={e => setOrientation(e.target.value)} style={{
                padding: 12,
                borderRadius: 10,
                border: '2px solid #6366f1',
                fontSize: 16,
                background: '#fff',
                color: '#3730a3',
                fontWeight: 700,
                boxShadow: '0 2px 8px #e0e7ff',
                outline: 'none',
                transition: 'border 0.2s'
              }}>
                {Object.keys(orientationAzimut).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            {/* Adresse */}
            <div style={{ gridColumn: '1 / span 2', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: '#6366f1', fontWeight: 800, fontSize: 16, marginBottom: 2 }}>
                <span role="img" aria-label="Adresse">📍</span> Adresse
              </label>
              <input type='text' value={adresse} onChange={e => setAdresse(e.target.value)} placeholder='Cliquez sur la carte ou saisissez une adresse' style={{
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
                transition: 'border 0.2s'
              }} />
              {adresseError && <span style={{ color: '#dc2626', marginLeft: 4, fontWeight: 700 }}>{adresseError}</span>}
            </div>
          </div>
          <div style={{ height: 260, marginTop: 18, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #c7d2fe' }}>
            <MapContainer center={coords} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
              <MapClickHandler />
              <Marker position={coords} icon={L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png', shadowSize: [41, 41] })} />
            </MapContainer>
          </div>
          {/* 4 cases infos clés sous la carte */}
          <div style={{ display: 'flex', gap: 18, marginTop: 18, marginBottom: 8 }}>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 10, padding: 16, textAlign: 'center', fontWeight: 700, color: '#3730a3', fontSize: 16 }}>
              Production annuelle estimée<br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>{loadingPVGIS ? 'Calcul...' : (prodMoyenneKwh ? prodMoyenneKwh + ' kWh' : pvError || '-')}</span>
            </div>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 10, padding: 16, textAlign: 'center', fontWeight: 700, color: '#3730a3', fontSize: 16 }}>
              Revente estimée par an<br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>{gainRevente ? gainRevente + ' €' : '-'}</span>
            </div>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 10, padding: 16, textAlign: 'center', fontWeight: 700, color: '#3730a3', fontSize: 16 }}>
              Prime EDF<br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>{prime ? prime + ' €' : '-'}</span>
            </div>
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 10, padding: 16, textAlign: 'center', fontWeight: 700, color: '#3730a3', fontSize: 16 }}>
              Années pour rentabilité<br />
              <span style={{ fontWeight: 900, fontSize: 20, color: '#0e7490' }}>{nbAnneesRentable ? nbAnneesRentable + ' an(s)' : '-'}</span>
            </div>
          </div>
          {/* Bannière rentabilité sous les cases */}
          <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: 10, fontWeight: 800, fontSize: 18, margin: '8px 0 0 0', textAlign: 'center' }}>
            {nbAnneesRentable ? `Projet rentable en ${nbAnneesRentable} an(s)` : 'Rentabilité non atteinte'}
          </div>
          {/* Bloc supprimé : résultats détaillés sous la carte, on garde seulement les 4 cases infos clés */}
          {/* Tableau de rentabilité sur 20 ans */}
          <div style={{ marginTop: 24 }}>
            <h4 style={{ color: '#3730a3', fontWeight: 700, fontSize: 20 }}>Tableau de rentabilité (20 ans)</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px #e0e7ff' }}>
              <thead>
                <tr style={{ background: '#c7d2fe' }}>
                  <th style={{ padding: 8 }}>Année</th>
                  <th style={{ padding: 8 }}>Coût EDF</th>
                  <th style={{ padding: 8 }}>Prix EDF (cts/kWh)</th>
                  <th style={{ padding: 8, color: '#2563eb' }}>Mensualité EDF</th>
                  <th style={{ padding: 8 }}>Coût centrale</th>
                  <th style={{ padding: 8, color: '#2563eb' }}>Mensualité centrale</th>
                  <th style={{ padding: 8 }}>Revente estimée</th>
                  <th style={{ padding: 8 }}>Différence</th>
                </tr>
              </thead>
              <tbody>
                {rentabilite && rentabilite.length > 0 ? rentabilite.map((row, i) => {
                  const diff = row.coutEdf - (row.coutCentrale || 0);
                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#f1f5f9' : '#fff' }}>
                      <td style={{ padding: 8 }}>{row.annee}</td>
                      <td style={{ padding: 8 }}>{row.coutEdf} €</td>
                      <td style={{ padding: 8 }}>{row.prixEdfCts} cts</td>
                      <td style={{ padding: 8, color: '#2563eb', fontWeight: 900 }}>{row.mensualiteEdf} €</td>
                      <td style={{ padding: 8 }}>{row.coutCentrale} €</td>
                      <td style={{ padding: 8, color: '#2563eb', fontWeight: 900 }}>{row.mensualiteCentrale} €</td>
                      <td style={{ padding: 8, color: '#bfa100', fontWeight: 900 }}>{row.reventeEstimee} €</td>
                      <td style={{ padding: 8, color: diff < 0 ? '#dc2626' : '#10b981', fontWeight: 700 }}>{diff.toFixed(2)} €</td>
                    </tr>
                  );
                }) : <tr><td colSpan={8} style={{ textAlign: 'center', padding: 12 }}>Aucune donnée</td></tr>}
              </tbody>
              {rentabilite && rentabilite.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#fef9c3', fontWeight: 900 }}>
                    <td style={{ padding: 8 }}>Total 20 ans</td>
                    {/* Total coût EDF */}
                    <td style={{ padding: 8, color: '#3730a3' }}>{rentabilite.reduce((acc, row) => acc + (row.coutEdf || 0), 0).toLocaleString()} €</td>
                    <td style={{ padding: 8 }}>-</td>
                    <td style={{ padding: 8, color: '#2563eb' }}>-</td>
                    <td style={{ padding: 8 }}>-</td>
                    <td style={{ padding: 8, color: '#2563eb' }}>-</td>
                    {/* Total revente estimée */}
                    <td style={{ padding: 8, color: '#bfa100', fontWeight: 900 }}>{rentabilite.reduce((acc, row) => acc + (row.reventeEstimee || 0), 0).toLocaleString()} €</td>
                    {/* Total économies (différence) */}
                    <td style={{ padding: 8, color: '#10b981', fontWeight: 900 }}>{totalDiff ? totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : '-'}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Boutons actions */}
          <div style={{ marginTop: 24, display: 'flex', gap: 18 }}>
            <button onClick={() => setShowClientModal(true)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>
              Assigner cette étude à un client
            </button>
            <button onClick={handleGeneratePDF} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>
              Générer PDF récapitulatif
            </button>
            <button onClick={async () => await handleGeneratePDF(true)} style={{ background: '#f59e42', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 800, fontSize: 18, cursor: 'pointer' }}>
              Aperçu PDF
            </button>
          </div>
        </div>
        {/* Colonne financement à droite */}
        <div style={{
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
          overflow: 'hidden'
        }}>
          <h3 style={{
            color: '#3730a3',
            fontWeight: 900,
            fontSize: 28,
            marginBottom: 18,
            letterSpacing: 1,
            textShadow: '0 2px 8px #c7d2fe'
          }}>💸 Simulation financement</h3>
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}>Banque</label>
            <select value={banque} onChange={handleBanqueChange} style={{
              padding: 10,
              borderRadius: 10,
              border: '1.5px solid #6366f1',
              fontSize: 16,
              background: '#fff',
              color: '#3730a3',
              fontWeight: 700,
              boxShadow: '0 2px 8px #e0e7ff'
            }}>
              {banques.map(bk => <option key={bk.nom} value={bk.nom}>{bk.nom}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}>Durée du financement : <span style={{ color: '#6366f1', fontWeight: 900 }}>{mois} mois</span></label>
            <input
              type='range'
              min={12}
              max={dureeMax}
              value={mois}
              onChange={e => setMois(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#6366f1',
                height: 6,
                borderRadius: 6,
                background: 'linear-gradient(90deg,#6366f1 0%,#a5b4fc 100%)',
                marginTop: 8
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginTop: 2 }}>
              <span>12 mois</span>
              <span>{dureeMax} mois</span>
            </div>
          </div>
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}>Taux (%)</label>
            <input type='number' value={taux} step={0.01} min={0} onChange={e => setTaux(Number(e.target.value))} style={{
              padding: 10,
              borderRadius: 10,
              border: '1.5px solid #6366f1',
              fontSize: 16,
              background: '#fff',
              color: '#3730a3',
              fontWeight: 700,
              width: 120,
              boxShadow: '0 2px 8px #e0e7ff'
            }} />
          </div>
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}>Apport personnel (€)</label>
            <input type='number' value={apport} min={0} onChange={e => setApport(Number(e.target.value))} style={{
              padding: 10,
              borderRadius: 10,
              border: '1.5px solid #6366f1',
              fontSize: 16,
              background: '#fff',
              color: '#3730a3',
              fontWeight: 700,
              width: 160,
              boxShadow: '0 2px 8px #e0e7ff'
            }} />
          </div>
          <div style={{ marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontWeight: 700, color: '#3730a3', fontSize: 16 }}>Montant à financer (€)</label>
            <input type='number' value={montantFinance} min={0} onChange={e => setMontantFinance(Number(e.target.value))} style={{
              padding: 10,
              borderRadius: 10,
              border: '1.5px solid #6366f1',
              fontSize: 16,
              background: '#fff',
              color: '#3730a3',
              fontWeight: 700,
              width: 160,
              boxShadow: '0 2px 8px #e0e7ff'
            }} />
          </div>
          <div style={{
            background: 'linear-gradient(90deg,#10b981 60%,#6ee7b7 100%)',
            borderRadius: 16,
            padding: 22,
            fontWeight: 900,
            fontSize: 22,
            color: '#065f46',
            textAlign: 'center',
            boxShadow: '0 2px 12px #a7f3d0',
            marginTop: 8,
            letterSpacing: 1
          }}>
            Mensualité estimée&nbsp;: <span style={{ color: '#0e7490', fontWeight: 900 }}>{mensualite} €</span>
          </div>
        </div>
      </div>
    </>
  );
}
