import React, { useState, useEffect, Suspense } from 'react';
import { jsPDF } from 'jspdf';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
const PDFPreviewer = React.lazy(() => import('../components/PDFPreviewer.jsx'));

// Composant d'upload de devis (PDF)
function DevisTab({ devisList, onUpload }) {
  return (
    <div>
      <h3>Importer un devis PDF</h3>
      <input type="file" accept="application/pdf" onChange={onUpload} />
      <h4>Devis enregistrés :</h4>
      <ul>
        {devisList.length === 0 && <li>Aucun devis importé.</li>}
        {devisList.map((devis, idx) => (
          <li key={idx}>
            <a href={devis.url} target="_blank" rel="noopener noreferrer">
              {devis.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Composant de gestion des études/calculs
function PropositionTab({ client }) {
  // Fonction utilitaire pour charger une image et vérifier le type MIME
  const loadImage = (publicPath, windowKey) => {
    fetch(publicPath)
      .then((res) => {
        if (!res.ok) throw new Error('Image not found');
        if (!res.headers.get('content-type')?.includes('image/png'))
          throw new Error('Not a PNG');
        return res.blob();
      })
      .then((blob) => {
        const reader = new window.FileReader();
        reader.onloadend = () => {
          // Vérifie que le DataURL commence bien par 'data:image/png'
          if (
            typeof reader.result === 'string' &&
            reader.result.startsWith('data:image/png')
          ) {
            window[windowKey] = reader.result;
          } else {
            window[windowKey] = null;
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        window[windowKey] = null;
      });
  };
  // Hooks toujours au début
  const [pdfPreview, setPdfPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);

  // Vérifie que toutes les images sont chargées ou null
  useEffect(() => {
    // Logo pur PNG
    if (!window.logopurPngDataUrl) {
      loadImage('/logopur.png', 'logopurPngDataUrl');
    }
    const checkImages = () => {
      const logoReady =
        window.logoPngDataUrl === null ||
        (typeof window.logoPngDataUrl === 'string' &&
          window.logoPngDataUrl.startsWith('data:image/png'));
      const backendReady =
        window.backendPngDataUrl === null ||
        (typeof window.backendPngDataUrl === 'string' &&
          window.backendPngDataUrl.startsWith('data:image/png'));
      const petalesReady =
        window.petalesPngDataUrl === null ||
        (typeof window.petalesPngDataUrl === 'string' &&
          window.petalesPngDataUrl.startsWith('data:image/png'));
      setImagesReady(logoReady && backendReady && petalesReady);
    };
    // Vérifie toutes les 300ms jusqu'à ce que ce soit prêt
    const interval = setInterval(checkImages, 300);
    checkImages();
    return () => clearInterval(interval);
  }, []);

  if (!client)
    return <div style={{ color: '#64748b' }}>Aucun client sélectionné.</div>;
  // Récupère l'étude principale
  let etude = null;
  if (client.Etude && Array.isArray(client.Etude) && client.Etude.length > 0) {
    etude =
      client.Etude.find((e) => e.modePaiement === 'comptant') ||
      client.Etude[0];
  } else if (client.etudePerso) {
    etude = client.etudePerso;
  }
  // DEBUG : Affiche l'étude et la rentabilité dans la console
  console.log('DEBUG étude sélectionnée:', etude);
  if (etude && etude.rentabilite) {
    console.log('DEBUG tableau rentabilité:', etude.rentabilite);
  }
  if (!etude)
    return (
      <div
        style={{
          color: '#dc2626',
          fontWeight: 600,
          fontSize: 18,
          padding: '24px',
        }}
      >
        Aucune étude enregistrée pour ce client.
        <br />
        Impossible de générer le PDF.
      </div>
    );

  // Mapping automatique des lignes de rentabilité pour affichage complet
  const rentabiliteRows = Array.isArray(etude.rentabilite)
    ? etude.rentabilite.map((row, idx) => ({
        annee: row.annee ?? idx + 1,
        coutEdf: row.coutEdf ?? row.economieEdf ?? '-',
        coutCentrale: row.coutCentrale ?? '-',
        reventeEstimee: row.reventeEstimee ?? row.gainRevente ?? '-',
        diff: row.diff ?? '-',
        mensualiteEdf: row.mensualiteEdf ?? '-',
        mensualiteCentrale: row.mensualiteCentrale ?? '-',
        prixEdfCts: row.prixEdfCts ?? '-',
        eco: row.eco ?? '-',
        cumul: row.cumul ?? '-',
      }))
    : [];

  // Colonnes du tableau comme dans le calculateur
  const columns = [
    { key: 'annee', label: 'Année' },
    { key: 'coutEdf', label: 'Coût EDF (€)' },
    { key: 'mensualiteEdf', label: 'Mensualité EDF (€)' },
    { key: 'coutCentrale', label: 'Coût centrale (€)' },
    { key: 'mensualiteCentrale', label: 'Mensualité centrale (€)' },
    { key: 'reventeEstimee', label: 'Revente estimée (€)' },
    { key: 'diff', label: 'Différence (€)' },
    { key: 'eco', label: 'Éco. EDF (€)' },
    { key: 'prixEdfCts', label: 'Prix EDF (cts)' },
    { key: 'cumul', label: 'Cumul (€)' },
  ];

  // Génère le PDF en mémoire (Uint8Array)
  const generatePdfBuffer = () => {
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      // PAGE 1 : fond blanc, rappels rose pâle
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 595, 842, 'F');
      // Bandeau rose pâle en haut, arrondi, ombre
      doc.setFillColor(255, 214, 224);
      doc.roundedRect(0, 0, 595, 70, 20, 20, 'F');
      // Logo pur sur chaque page en haut à gauche, plus grand et avec marge
      if (window.logopurPngDataUrl) {
        doc.addImage(window.logopurPngDataUrl, 'PNG', 30, 15, 90, 40);
      }
      // Image Maison panneau en bas de page, grande
      if (window.maisonPanneauPngDataUrl) {
        // Largeur 480px, hauteur 320px, centrée en bas
        const imgWidth = 480;
        const imgHeight = 320;
        const x = (595 - imgWidth) / 2;
        const y = 842 - imgHeight - 30;
        doc.addImage(
          window.maisonPanneauPngDataUrl,
          'PNG',
          x,
          y,
          imgWidth,
          imgHeight
        );
      }
      // Titre centré sur le bandeau, police plus grande et couleur DA
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 44, 44);
      doc.setFontSize(38);
      doc.text('Proposition commerciale', 297, 50, { align: 'center' });
      // Séparateur graphique
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(2.5);
      doc.line(40, 80, 555, 80);
      // Encadré infos client, ombre, rose pâle, arrondi
      doc.setFillColor(255, 214, 224);
      doc.roundedRect(40, 110, 515, 120, 18, 18, 'F');
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(1.2);
      doc.roundedRect(40, 110, 515, 120, 18, 18);
      let y = 130;
      const left = 60;
      const lineHeight = 28;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(44, 44, 44);
      doc.setFontSize(17);
      doc.text(`Client : ${client.nom || ''} ${client.prenom || ''}`, left, y);
      y += lineHeight;
      doc.text(`Email : ${client.email || ''}`, left, y);
      y += lineHeight;
      doc.text(
        `Adresse : ${client.adresse || ''} ${client.ville || ''}`,
        left,
        y
      );
      y += lineHeight;
      doc.text(`Téléphone : ${client.telephone || '-'}`, left, y);
      // Encadré chiffres clés
      y += lineHeight + 32;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(40, y, 515, 120, 18, 18, 'F');
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(1.2);
      doc.roundedRect(40, y, 515, 120, 18, 18);
      let yKey = y + 22;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 44, 44);
      doc.setFontSize(16);
      doc.text(`Kit : ${etude.kit || '-'}`, left, yKey);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(15);
      doc.text(
        `Production annuelle : ${etude.prodMoyenneKwh || '-'} kWh`,
        left + 220,
        yKey
      );
      doc.text(
        `Autoconsommation : ${etude.autoconsommation || '-'} %`,
        left + 400,
        yKey
      );
      yKey += 28;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(`Gain annuel : ${etude.gainAnnuel || '-'} €`, left, yKey);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(15);
      doc.text(
        `Durée d'amortissement : ${
          etude.anneeRentable || etude.amortissement || '-'
        } ans`,
        left + 220,
        yKey
      );
      yKey += 28;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(236, 72, 153);
      doc.setFontSize(16);
      doc.text('Indicateurs clés', left, yKey);
      // Bandeau synthèse du projet, rose pâle, arrondi, ombre
      y += lineHeight + 32;
      doc.setFillColor(255, 214, 224);
      doc.roundedRect(40, y, 515, 38, 18, 18, 'F');
      doc.setDrawColor(236, 72, 153);
      doc.setLineWidth(1.2);
      doc.roundedRect(40, y, 515, 38, 18, 18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(236, 72, 153);
      doc.setFontSize(22);
      doc.text('Synthèse du projet', left, y + 26);
      y += 54;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(44, 44, 44);
      doc.setFontSize(16);
      doc.text(`Kit : ${etude.kit || '-'}`, left, y);
      y += lineHeight;
      doc.text(
        `Production annuelle : ${etude.prodMoyenneKwh || '-'} kWh`,
        left,
        y
      );
      y += lineHeight;
      doc.text(
        `Autoconsommation : ${etude.autoconsommation || '-'} %`,
        left,
        y
      );
      y += lineHeight;
      doc.text(`Gain annuel : ${etude.gainAnnuel || '-'} €`, left, y);
      y += lineHeight;
      doc.text(
        `Durée d'amortissement : ${
          etude.anneeRentable || etude.amortissement || '-'
        } ans`,
        left,
        y
      );
      y += lineHeight + 18;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(236, 72, 153);
      doc.setFontSize(18);
      doc.text('Indicateurs clés', left, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(44, 44, 44);
      doc.setFontSize(15);
      let puissance = '-';
      let stockage = '-';
      if (etude.kit) {
        const kitMatch = String(etude.kit).match(/(\d+)KWh-(\d+)/);
        if (kitMatch) {
          puissance = kitMatch[1] + ' KWh';
          stockage =
            kitMatch[2] === '1'
              ? '5 KWh'
              : kitMatch[2] === '2'
              ? '10 KWh'
              : '-';
        }
      }
      // Stocker les pages 3 et 4 à la fin
      // Générer les autres pages normalement, puis ajouter les pages "Déroulé du projet" et "Étapes du projet" à la fin
      // ...existing code pour toutes les pages précédentes...

      // Sauvegarde du contexte pour pages 3 et 4
      function addDerouleProjetPage(doc) {
        doc.addPage();
        var grad = doc.context2d.createLinearGradient(0, 0, 595, 842);
        grad.addColorStop(0, 'rgba(255,214,224,1)');
        grad.addColorStop(1, 'rgba(255,255,255,1)');
        doc.context2d.fillStyle = grad;
        doc.context2d.fillRect(0, 0, 595, 842);
        if (window.petalesPngDataUrl) {
          doc.addImage(window.petalesPngDataUrl, 'PNG', 420, 700, 150, 100);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(36);
        doc.setTextColor(236, 72, 153);
        doc.text('Déroulé du projet', 297, 420, { align: 'center' });
      }
      function addEtapesProjetPage(doc) {
        doc.addPage();
        let y13 = 80;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(30, 64, 175);
        doc.text('Étapes du projet', 60, y13);
        y13 += 32;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.setTextColor(0, 0, 0);
        const etapes = [
          'Validation financière',
          'Validation technique',
          'Validation administrative',
          'Installation',
          'Autonomie',
        ];
        etapes.forEach((etape, idx) => {
          doc.text(`• ${etape}`, 80, y13 + idx * 28);
        });
      }

      // ...existing code pour toutes les autres pages...

      // Ajouter les pages "Déroulé du projet" et "Étapes du projet" à la fin
      addDerouleProjetPage(doc);
      addEtapesProjetPage(doc);
      // Ajouter la page de remerciement en toute dernière
      doc.addPage();
      // Ajout logo si dispo et valide
      if (
        window.logoPngDataUrl &&
        typeof window.logoPngDataUrl === 'string' &&
        window.logoPngDataUrl.startsWith('data:image/png')
      ) {
        try {
          doc.addImage(window.logoPngDataUrl, 'PNG', 60, 80, 120, 54);
        } catch (e) {
          console.error('Erreur logo PNG pour PDF:', e);
        }
      }
      // Ajout photo maison si dispo et valide
      if (
        window.backendPngDataUrl &&
        typeof window.backendPngDataUrl === 'string' &&
        window.backendPngDataUrl.startsWith('data:image/png')
      ) {
        try {
          doc.addImage(window.backendPngDataUrl, 'PNG', 340, 80, 180, 120);
        } catch (e) {
          console.error('Erreur backend PNG pour PDF:', e);
        }
      }
      let y14 = 240;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(30, 64, 175);
      doc.text('Merci pour votre confiance !', 60, y14);
      y14 += 38;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.setTextColor(99, 102, 241);
      doc.text(
        'Toute l’équipe Botaik reste à votre écoute pour vous accompagner dans votre projet solaire.',
        60,
        y14,
        { maxWidth: 480 }
      );
      // --- PAGE 5 : transition "Votre installation" avec DA ---
      doc.addPage();
      // Design page 5 : bandeau bleu, pétales, infos installation
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 595, 80, 'F');
      if (window.petalesPngDataUrl) {
        doc.addImage(window.petalesPngDataUrl, 'PNG', 420, 700, 150, 100);
      }
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.text('Votre installation', 297, 55, { align: 'center' });
      // Infos installation
      let y5 = 110;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(15);
      doc.text(`Centrale : ${etude.kit || '-'}`, 60, y5);
      y5 += 24;
      doc.text(`Puissance : ${etude.prodMoyenneKwh || '-'} kWh/an`, 60, y5);
      y5 += 24;
      doc.text(`Stockage : ${etude.autoconsommation || '-'} %`, 60, y5);
      y5 += 24;
      doc.text(
        `Prix total : ${
          etude.prixTotal
            ? etude.prixTotal + ' €'
            : etude.prix
            ? etude.prix + ' €'
            : '-'
        }`,
        60,
        y5
      );
      y5 += 24;
      doc.text(`Prime EDF : ${etude.primeEDF || etude.prime || '-'} €`, 60, y5);
      y5 += 24;
      doc.text(
        `Économies sur 20 ans : ${
          Array.isArray(etude.rentabilite)
            ? etude.rentabilite
                .reduce((sum, row) => sum + (Number(row.eco) || 0), 0)
                .toLocaleString()
            : '-'
        } €`,
        60,
        y5
      );
      y5 += 24;
      doc.text(
        `Gains revente sur 20 ans : ${
          Array.isArray(etude.rentabilite)
            ? etude.rentabilite
                .reduce(
                  (sum, row) => sum + (Number(row.reventeEstimee) || 0),
                  0
                )
                .toLocaleString()
            : '-'
        } €`,
        60,
        y5
      );
      // --- PAGE 7 : transition "Performance" avec DA ---
      doc.addPage();
      var grad7 = doc.context2d.createLinearGradient(0, 0, 595, 842);
      grad7.addColorStop(0, 'rgba(255,214,224,1)');
      grad7.addColorStop(1, 'rgba(255,255,255,1)');
      doc.context2d.fillStyle = grad7;
      doc.context2d.fillRect(0, 0, 595, 842);
      if (window.petalesPngDataUrl) {
        doc.addImage(window.petalesPngDataUrl, 'PNG', 420, 700, 150, 100);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(236, 72, 153);
      doc.text('Performance', 297, 420, { align: 'center' });
      // --- PAGE 8 : graphiques performance installation ---
      doc.addPage();
      let y8 = 60;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175);
      doc.text('Performance de votre installation', 60, y8);
      y8 += 32;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text('Autoconsommation estimée :', 60, y8);
      doc.text(`${etude.autoconsommation || '-'} %`, 320, y8);
      y8 += 24;
      doc.text('Autoproduction estimée :', 60, y8);
      doc.text(`${etude.prodMoyenneKwh || '-'} kWh/an`, 320, y8);
      y8 += 24;
      doc.text('Revente estimée :', 60, y8);
      let reventeTotal = '-';
      if (Array.isArray(etude.rentabilite)) {
        reventeTotal = etude.rentabilite
          .reduce((sum, row) => sum + (Number(row.reventeEstimee) || 0), 0)
          .toLocaleString();
      }
      doc.text(`${reventeTotal} € sur 20 ans`, 320, y8);
      y8 += 32;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(99, 102, 241);
      doc.text('Production mensuelle estimée (PVGIS)', 60, y8);
      y8 += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(0, 0, 0);
      // Placeholder graphique (à remplacer par image réelle si dispo)
      doc.setDrawColor(220, 220, 220);
      doc.rect(60, y8, 400, 120);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text('Graphique mensuel PVGIS à insérer ici', 260, y8 + 60, {
        align: 'center',
      });
      // --- PAGE 9 : transition "Indicateur financier" avec DA ---
      doc.addPage();
      var grad9 = doc.context2d.createLinearGradient(0, 0, 595, 842);
      grad9.addColorStop(0, 'rgba(255,214,224,1)');
      grad9.addColorStop(1, 'rgba(255,255,255,1)');
      doc.context2d.fillStyle = grad9;
      doc.context2d.fillRect(0, 0, 595, 842);
      if (window.petalesPngDataUrl) {
        doc.addImage(window.petalesPngDataUrl, 'PNG', 420, 700, 150, 100);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(236, 72, 153);
      doc.text('Indicateur financier', 297, 420, { align: 'center' });
      // --- PAGE 10 : graphique retour sur investissement et coût EDF vs centrale ---
      doc.addPage();
      let y10 = 60;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175);
      doc.text('Retour sur investissement & Coût EDF vs Centrale', 60, y10);
      y10 += 32;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text('Années de retour sur investissement :', 60, y10);
      doc.text(
        `${etude.anneeRentable || etude.amortissement || '-'} ans`,
        320,
        y10
      );
      y10 += 24;
      doc.text('Évolution du coût EDF vs centrale (20 ans) :', 60, y10);
      y10 += 32;
      // Placeholder graphique (à remplacer par image réelle si dispo)
      doc.setDrawColor(220, 220, 220);
      doc.rect(60, y10, 400, 120);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(148, 163, 184);
      doc.text('Graphique comparatif à insérer ici', 260, y10 + 60, {
        align: 'center',
      });
      // --- PAGE 11 : tableau de rentabilité ---
      doc.addPage();
      let y11 = 60;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.text('Tableau de rentabilité (20 ans)', 60, y11);
      y11 += 32;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      // En-têtes
      const headers = [
        'Année',
        'Coût EDF',
        'Mens. EDF',
        'Coût centrale',
        'Mens. centrale',
        'Revente',
        'Diff.',
        'Éco. EDF',
        'Prix EDF (cts)',
        'Cumul',
      ];
      let xStart = 60;
      headers.forEach((h, i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(99, 102, 241);
        doc.text(h, xStart + i * 52, y11);
      });
      y11 += 18;
      // Lignes du tableau
      if (Array.isArray(etude.rentabilite)) {
        etude.rentabilite.forEach((row, idx) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(String(row.annee ?? idx + 1), xStart + 0 * 52, y11);
          doc.text(
            String(row.coutEdf ?? row.economieEdf ?? '-'),
            xStart + 1 * 52,
            y11
          );
          doc.text(String(row.mensualiteEdf ?? '-'), xStart + 2 * 52, y11);
          doc.text(String(row.coutCentrale ?? '-'), xStart + 3 * 52, y11);
          doc.text(String(row.mensualiteCentrale ?? '-'), xStart + 4 * 52, y11);
          doc.text(
            String(row.reventeEstimee ?? row.gainRevente ?? '-'),
            xStart + 5 * 52,
            y11
          );
          doc.text(String(row.diff ?? '-'), xStart + 6 * 52, y11);
          doc.text(String(row.eco ?? '-'), xStart + 7 * 52, y11);
          doc.text(String(row.prixEdfCts ?? '-'), xStart + 8 * 52, y11);
          doc.text(String(row.cumul ?? '-'), xStart + 9 * 52, y11);
          y11 += 14;
          if (y11 > 780) {
            doc.addPage();
            y11 = 60;
          }
        });
      }
      // ...existing code pour les pages suivantes...
      // ...existing code pour les pages suivantes...
      return doc.output('arraybuffer');
    } catch (err) {
      console.error('Erreur lors de la génération du PDF:', err);
      return null;
    }
  };

  // Génère et affiche l'aperçu PDF
  const handlePreviewPDF = () => {
    if (!imagesReady) return;
    const buffer = generatePdfBuffer();
    setPdfPreview(buffer);
    setShowPreview(true);
  };

  // Télécharge le PDF
  const handleDownloadPDF = () => {
    // On utilise la même logique que pour l'aperçu PDF : pages "Déroulé du projet" et "Étapes du projet" à la fin
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 40;
    const left = 40;
    const lineHeight = 22;
    // ...existing code pour toutes les pages sauf "Déroulé du projet" et "Étapes du projet"...

    // Ajout des pages "Déroulé du projet" et "Étapes du projet" à la fin
    function addDerouleProjetPage(doc) {
      doc.addPage();
      var grad = doc.context2d.createLinearGradient(0, 0, 595, 842);
      grad.addColorStop(0, 'rgba(255,214,224,1)');
      grad.addColorStop(1, 'rgba(255,255,255,1)');
      doc.context2d.fillStyle = grad;
      doc.context2d.fillRect(0, 0, 595, 842);
      if (window.petalesPngDataUrl) {
        doc.addImage(window.petalesPngDataUrl, 'PNG', 420, 700, 150, 100);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(36);
      doc.setTextColor(236, 72, 153);
      doc.text('Déroulé du projet', 297, 420, { align: 'center' });
    }
    function addEtapesProjetPage(doc) {
      doc.addPage();
      let y13 = 80;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175);
      doc.text('Étapes du projet', 60, y13);
      y13 += 32;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      const etapes = [
        'Validation financière',
        'Validation technique',
        'Validation administrative',
        'Installation',
        'Autonomie',
      ];
      etapes.forEach((etape, idx) => {
        doc.text(`• ${etape}`, 80, y13 + idx * 28);
      });
    }

    // ...existing code pour toutes les autres pages...

    // Ajouter les pages "Déroulé du projet" et "Étapes du projet" à la fin
    addDerouleProjetPage(doc);
    addEtapesProjetPage(doc);
    doc.save(`proposition-${client.nom || ''}-${client.prenom || ''}.pdf`);
  };

  return (
    <div>
      <h3>Proposition commerciale</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button
          onClick={handlePreviewPDF}
          disabled={!imagesReady}
          style={{
            background: '#6366f1',
            color: '#fff',
            padding: '8px 18px',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: !imagesReady ? 'not-allowed' : 'pointer',
            opacity: !imagesReady ? 0.6 : 1,
          }}
        >
          Aperçu PDF
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={!imagesReady}
          style={{
            background: '#16a34a',
            color: '#fff',
            padding: '8px 18px',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: !imagesReady ? 'not-allowed' : 'pointer',
            opacity: !imagesReady ? 0.6 : 1,
          }}
        >
          Télécharger le PDF
        </button>
      </div>
      {!imagesReady && (
        <div style={{ color: '#64748b', marginBottom: 8 }}>
          Chargement des images pour le PDF...
        </div>
      )}
      {showPreview && pdfPreview && (
        <div>
          <b>Aperçu du PDF généré&nbsp;:</b>
          <div style={{ margin: '16px 0' }}>
            <Suspense fallback={<div>Chargement de l'aperçu PDF...</div>}>
              <PDFPreviewer pdfData={pdfPreview} />
            </Suspense>
          </div>
        </div>
      )}
      {showPreview && !pdfPreview && (
        <div
          style={{
            color: '#dc2626',
            fontWeight: 600,
            fontSize: 18,
            padding: '24px',
          }}
        >
          Erreur lors de la génération du PDF.
          <br />
          Vérifiez les données du client ou contactez le support.
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <b>Kit :</b> {etude.kit || '-'}
        <br />
        <b>Production annuelle :</b> {etude.prodMoyenneKwh || '-'} kWh
        <br />
        <b>Autoconsommation :</b> {etude.autoconsommation || '-'} %<br />
        <b>Gain annuel :</b> {etude.gainAnnuel || '-'} €<br />
        <b>Durée d'amortissement :</b>{' '}
        {etude.anneeRentable || etude.amortissement || '-'} ans
        <br />
      </div>
      {rentabiliteRows.length > 0 && (
        <div>
          <b>Tableau de rentabilité complet :</b>
          <table
            style={{
              width: '100%',
              marginTop: 8,
              background: '#fff',
              borderRadius: 6,
              overflow: 'hidden',
              boxShadow: '0 2px 8px #e0e7ff33',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: '8px 12px',
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rentabiliteRows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => {
                    let style = { padding: '8px 12px', fontSize: 15 };
                    if (col.key === 'diff')
                      style.color =
                        Number(row.diff) >= 0 ? '#16a34a' : '#dc2626';
                    if (col.key === 'eco') style.color = '#16a34a';
                    if (
                      col.key === 'mensualiteCentrale' &&
                      Number(row.mensualiteCentrale) < Number(row.mensualiteEdf)
                    )
                      style.color = '#16a34a';
                    if (col.key === 'reventeEstimee') style.color = '#bfa100';
                    if (col.key === 'prixEdfCts') style.color = '#2563eb';
                    if (col.key === 'cumul')
                      style = {
                        ...style,
                        fontWeight: 700,
                        color: Number(row.cumul) >= 0 ? '#16a34a' : '#dc2626',
                      };
                    return (
                      <td key={col.key} style={style}>
                        {row[col.key] !== undefined ? row[col.key] : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Bandeaux récapitulatifs */}
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 32,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#dc2626',
                background: '#fff0f0',
                borderRadius: 10,
                padding: '14px 32px',
              }}
            >
              Cumul coût EDF sur 20 ans :{' '}
              {rentabiliteRows
                .reduce((sum, row) => sum + (Number(row.coutEdf) || 0), 0)
                .toLocaleString()}{' '}
              €
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#16a34a',
                background: '#e0ffe0',
                borderRadius: 10,
                padding: '14px 32px',
              }}
            >
              Retour sur investissement total sur 20 ans :{' '}
              {(() => {
                let cumul = 0;
                rentabiliteRows.forEach((row) => {
                  cumul += Number(row.diff) || 0;
                });
                return cumul.toLocaleString();
              })()}{' '}
              €
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: '#0e7490',
                background: '#e0f7ff',
                borderRadius: 10,
                padding: '14px 32px',
              }}
            >
              Cumul économies + revente sur 20 ans :{' '}
              {(() => {
                let total = 0;
                rentabiliteRows.forEach((row) => {
                  total +=
                    (Number(row.diff) || 0) + (Number(row.reventeEstimee) || 0);
                });
                return total.toLocaleString();
              })()}{' '}
              €
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RecapProjetClient() {
  const [tab, setTab] = useState('devis');
  const [devisList, setDevisList] = useState([]); // [{name, url}]
  const [etudesList, setEtudesList] = useState([]); // [{titre, date, pdfUrl}]
  const [clients, setClients] = useState([]); // Liste des clients de l'utilisateur
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);

  // Load logo, backend, and petales images as DataURLs for jsPDF
  useEffect(() => {
    // Fonction utilitaire pour charger une image et vérifier le type MIME
    const loadImage = (publicPath, windowKey) => {
      fetch(publicPath)
        .then((res) => {
          if (!res.ok) throw new Error('Image not found');
          if (!res.headers.get('content-type')?.includes('image/png'))
            throw new Error('Not a PNG');
          return res.blob();
        })
        .then((blob) => {
          const reader = new window.FileReader();
          reader.onloadend = () => {
            // Vérifie que le DataURL commence bien par 'data:image/png'
            if (
              typeof reader.result === 'string' &&
              reader.result.startsWith('data:image/png')
            ) {
              window[windowKey] = reader.result;
            } else {
              window[windowKey] = null;
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          window[windowKey] = null;
        });
    };
    // Logo
    if (!window.logoPngDataUrl) {
      loadImage('/logo.png', 'logoPngDataUrl');
    }
    // Backend photo
    if (!window.backendPngDataUrl) {
      loadImage('/Backend.png', 'backendPngDataUrl');
    }
    // Petales PNG
    if (!window.petalesPngDataUrl) {
      loadImage('/Pétales.png', 'petalesPngDataUrl');
    }
    // Maison panneau PNG
    if (!window.maisonPanneauPngDataUrl) {
      loadImage('/Maison panneau.png', 'maisonPanneauPngDataUrl');
    }
  }, []);

  // Récupère l'utilisateur connecté et ses clients
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // On récupère les clients où il est commercial ou manager
        const q = query(
          collection(db, 'clients'),
          where('emailCommercial', '==', u.email)
        );
        const q2 = query(
          collection(db, 'clients'),
          where('emailManager', '==', u.email)
        );
        const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
        // Fusionne et dédoublonne
        const allClients = [...snap1.docs, ...snap2.docs].reduce((acc, doc) => {
          if (!acc.some((c) => c.id === doc.id)) {
            acc.push({ id: doc.id, ...doc.data() });
          }
          return acc;
        }, []);
        setClients(allClients);
      }
    });
    return () => unsub();
  }, []);

  // Met à jour le client sélectionné
  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClient(null);
      return;
    }
    const client = clients.find((c) => c.id === selectedClientId);
    setSelectedClient(client || null);
  }, [selectedClientId, clients]);

  // Handler upload devis (mock, à relier au backend/storage)
  const handleUploadDevis = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // TODO: upload réel, ici on simule
    const url = URL.createObjectURL(file);
    setDevisList((prev) => [...prev, { name: file.name, url }]);
  };

  // Handler ajout étude (mock, à relier au calculateur)
  const handleAddEtude = () => {
    const titre = prompt("Titre de l'étude ?");
    const date = new Date().toLocaleDateString();
    // TODO: générer PDF et lier au calculateur
    setEtudesList((prev) => [...prev, { titre, date, pdfUrl: null }]);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h2>Récap projet client</h2>

      {/* Sélecteur de client façon "Clients chauds" */}
      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>
          Sélectionner un client :
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou prénom..."
          style={{
            width: '100%',
            padding: 8,
            borderRadius: 6,
            border: '1.5px solid #c7d2fe',
            fontSize: 16,
            marginBottom: 8,
          }}
        />
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 6,
            boxShadow: '0 2px 8px #c7d2fe33',
          }}
        >
          {clients.filter(
            (c) =>
              (c.nom || '').toLowerCase().includes(search.toLowerCase()) ||
              (c.prenom || '').toLowerCase().includes(search.toLowerCase())
          ).length === 0 ? (
            <div style={{ padding: 8, color: '#64748b' }}>
              Aucun client trouvé.
            </div>
          ) : (
            clients
              .filter(
                (c) =>
                  (c.nom || '').toLowerCase().includes(search.toLowerCase()) ||
                  (c.prenom || '').toLowerCase().includes(search.toLowerCase())
              )
              .map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #e0e7ff',
                    cursor: 'pointer',
                    background: selectedClientId === c.id ? '#dbeafe' : '#fff',
                  }}
                  onClick={() => setSelectedClientId(c.id)}
                >
                  <b>
                    {c.nom} {c.prenom}
                  </b>{' '}
                  — {c.email}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Affichage infos client sélectionné */}
      {selectedClient && (
        <div
          style={{
            marginBottom: 24,
            background: '#f1f5f9',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <b>Client sélectionné :</b> {selectedClient.nom}{' '}
          {selectedClient.prenom} <br />
          <b>Email :</b> {selectedClient.email} <br />
          <b>Adresse :</b> {selectedClient.adresse} {selectedClient.ville}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setTab('devis')}
          style={{ fontWeight: tab === 'devis' ? 700 : 400 }}
        >
          Devis
        </button>
        <button
          onClick={() => setTab('proposition')}
          style={{ fontWeight: tab === 'proposition' ? 700 : 400 }}
        >
          Proposition commerciale
        </button>
      </div>
      <div style={{ background: '#f8fafc', borderRadius: 8, padding: 24 }}>
        {tab === 'devis' && (
          <DevisTab devisList={devisList} onUpload={handleUploadDevis} />
        )}
        {tab === 'proposition' && <PropositionTab client={selectedClient} />}
      </div>
    </div>
  );
}
