import React, { useState, useEffect, useCallback } from 'react';
import ChartRentabiliteBar from '../components/ChartRentabiliteBar.jsx';
import ChartBreakEven from '../components/ChartBreakEven.jsx';
import ChartKwhRoi from '../components/ChartKwhRoi.jsx';
import { getAuth } from 'firebase/auth';
import { getFirestore, getDocs, collection, addDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import * as XLSX from 'xlsx';

// Fonction utilitaire pour extraire la puissance depuis le champ kit
function getPuissanceStockage(etude) {
  if (!etude || !etude.kit) return '-';
  const kitMatch = String(etude.kit).match(/(\d+)KWh-(\d+)/);
  if (kitMatch) {
    return kitMatch[1] + ' KWh';
  }
  return '-';
}

// Fonction utilitaire pour générer les tags/jauges (placeholder)
function getTagsJaugesHtml() {
  return '';
}

// Fonction utilitaire pour extraire les données d'étude (simplifiée)
function getEtudeData(etude) {
  if (!etude) return {};
  const puissance = getPuissanceStockage(etude);
  const production = etude.prodMoyenneKwh ? etude.prodMoyenneKwh + ' kWh/an' : '-';
  const gainPremiereAnnee = etude.gainAnnuel ? etude.gainAnnuel + ' €' : '-';
  const anneeRentabilite = etude.anneeRentable || etude.amortissement || '-';
  return { puissance, production, gainPremiereAnnee, anneeRentabilite };
}

// ...existing code...

// Page "Faire une proposition" pour importer et gérer des devis
const FaireProposition = () => {
  // Déclarations de hooks d'état
  const [selectedEtudesIdx, setSelectedEtudesIdx] = useState([]);
  const [devisFiles, setDevisFiles] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [searchClient, setSearchClient] = useState('');
  const [parsedDevis, setParsedDevis] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientDevis, setClientDevis] = useState([]);
  const [selectedDevisId, setSelectedDevisId] = useState('');
  const [mailContent, setMailContent] = useState('');
  const [pdfPreview, setPdfPreview] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedPdfId, setSelectedPdfId] = useState('');
  const [mailFields, setMailFields] = useState({ prix: '', date: '', options: '' });
  const [scriptMail, setScriptMail] = useState(
    `Monsieur et Madame « [NomClient] »,\nSuite à notre échange, je vous adresse le récapitulatif de votre projet d’installation photovoltaïque.\n\n📌 Contexte\nConsommation actuelle : « [ConsoAnnuelle] », soit environ « [ConsoPrix] ».\nObjectifs : autonomie énergétique à [ObjectifAutonomie] et économies durables.\n\n⚡ Projet proposé\nCentrale photovoltaïque « [PuissanceCentrale] » avec « [Stockage] » de stockage.\nSurface de toiture à exploiter, environ « [SurfaceToiture] »\nProduction estimée : « [ProductionEstimee] ».\nPrix de base : « [PrixBase] ».\nPrime à percevoir (12–18 mois après validation) : « [Prime] ».\nCoût net après prime : [PrixBase] – [Prime] = « [PrixNet] »\n\n✅ Garanties\nModules photovoltaïques AE Solar : 30 ans (matériel + production).\nOnduleurs Solis : 15 ans.\nBatterie BSL : 15 ans.\n\n📑 Démarches administratives (prises en charges par Botaik)\nDéclaration préalable en mairie.\nDemande de raccordement auprès d’EDF/Enedis.\nSignature du contrat d’obligation d’achat (EDF OA).\nValidation technique (Consuel).\nVérification technique de la toiture et adaptation éventuelle de l’armature.\n\n🤝 Notre expertise et accompagnement\nPlus de 200 clients accompagnés avec succès dans leurs projets solaires.\nPartenaire Outenergie : 15 années d’expérience en pose, certifié QualiPV et RGE, permettant de garantir les normes de qualité et de vous faire bénéficier des primes EDF.\n👉 https://www.outenergiephotovoltaique.com/\nBotaik se distingue par sa transparence et son suivi, en vous accompagnant pendant toute la durée de vie de votre projet.\n\nMonsieur et Madame « [NomClient] », ce projet vous permettra de réduire vos factures EDF de manière significative, d’accéder à une autonomie énergétique de [ObjectifAutonomie] et de bénéficier d’un retour sur investissement rapide et durable.\nNous restons disponibles pour toute précision et pour avancer à vos côtés sur la mise en place du projet.\nBien cordialement,`
  );
  const [includeTableInMail, setIncludeTableInMail] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState('');
  // Refs pour les graphiques (pour export PNG)
  const chartKwhRoiRef = React.createRef();
  const chartRentabiliteBarRef = React.createRef();
  const chartBreakEvenRef = React.createRef();

  // Réinitialise l'étude sélectionnée à chaque changement de client ou de ses études
  useEffect(() => {
    const client = clients.find((c) => c.id === selectedClient);
    let etudes = [];
    if (client?.etudes && Array.isArray(client.etudes) && client.etudes.length > 0) {
      etudes = client.etudes;
    } else if (client?.etudePerso) {
      etudes = [client.etudePerso];
    }
    if (etudes.length > 0) {
      setSelectedEtudesIdx([0]);
    } else {
      setSelectedEtudesIdx([]);
    }
  }, [selectedClient, clients]);


  // Génère automatiquement le mail récapitulatif à chaque changement d'étude sélectionnée, client, etc.
  useEffect(() => {
    handleGenerateMail();
  }, [selectedEtudesIdx, selectedClient, clients, scriptMail, includeTableInMail]);

  // Récupère l'utilisateur connecté
  useEffect(() => {
    const auth = getAuth();
    setUser(auth.currentUser);
  }, []);

  // Charger dynamiquement la liste des clients depuis Firestore
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      const db = getFirestore(getApp());
      // Récupère le rôle de l'utilisateur
      let userRole = null;
      if (user) {
        const token = await user.getIdTokenResult();
        userRole = token.claims.role || null;
      }
      const snapshot = await getDocs(collection(db, 'clients'));
      let userClients = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (userRole === 'commercial') {
        userClients = userClients.filter(
          (c) => c.emailCommercial === user?.email
        );
      } else {
        userClients = userClients.filter((c) => c.emailManager === user?.email);
      }
      setClients(userClients);
      setLoadingClients(false);
    };
    if (user) fetchClients();
  }, [user]);

  // Charger les devis du client sélectionné
  useEffect(() => {
    const fetchDevis = async () => {
      if (!selectedClient) {
        setClientDevis([]);
        return;
      }
      const db = getFirestore(getApp());
      const snapshot = await getDocs(collection(db, 'devis'));
      const devisList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => d.clientId === selectedClient);
      setClientDevis(devisList);
    };
    fetchDevis();
  }, [selectedClient]);

  // Handler d'import de fichier PDF temporaire
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const pdfFile = files.find((f) => f.type === 'application/pdf');
    setPdfPreview(pdfFile ? URL.createObjectURL(pdfFile) : null);
  };

  // Parse le devis et affiche le tableau éditable
  const handleEditDevis = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    setParsedDevis(json);
  };

  // Affiche le PDF sélectionné
  const handlePreviewPdf = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPdfPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Edition du tableau
  const handleCellChange = (rowIdx, colIdx, value) => {
    setParsedDevis((prev) => {
      const copy = prev.map((row) => [...row]);
      copy[rowIdx][colIdx] = value;
      return copy;
    });
  };

  // Sauvegarder le devis modifié dans Firestore
  const handleSaveDevis = async () => {
    if (!selectedClient || !parsedDevis) return;
    const db = getFirestore(getApp());
    await addDoc(collection(db, 'devis'), {
      clientId: selectedClient,
      devis: parsedDevis,
      date: new Date().toISOString(),
    });
    alert('Devis sauvegardé !');
    setParsedDevis(null);
  };

  // Mail récapitulatif avec champs modifiables
  const handleGenerateMail = useCallback(() => {
    const client = clients.find((c) => c.id === selectedClient);
    let etudes = [];
    if (
      client?.etudes &&
      Array.isArray(client.etudes) &&
      client.etudes.length > 0
    ) {
      etudes = client.etudes;
    } else if (client?.etudePerso) {
      etudes = [client.etudePerso];
    }
    // Sécurise l'accès à l'étude sélectionnée
    let etude = {};
    if (etudes.length > 0) {
      if (selectedEtudesIdx.length > 0 && etudes[selectedEtudesIdx[0]]) {
        etude = etudes[selectedEtudesIdx[0]];
      } else {
        etude = etudes[0];
      }
    }
    const primeValue = etude.primeEDF || etude.prime || '';
    const nomClient =
      (client?.nom || '') + (client?.prenom ? ' ' + client.prenom : '');
    const consoAnnuelle = Number(etude.conso || etude.consoAnnuelle || 0);
    const consoPrix = consoAnnuelle ? (consoAnnuelle * 0.25).toFixed(2) : '';
    // Objectif autonomie toujours 95%
    const objectifAutonomie = '<b>95%</b>';
    // Extraction automatique puissance centrale et stockage depuis le champ kit
    let puissanceCentrale = getPuissanceStockage(etude);
    let stockage = '-';
    if (etude && etude.kit) {
      const kitMatch = String(etude.kit).match(/(\d+)KWh-(\d+)/);
      if (kitMatch) {
        if (kitMatch[2] === '1') {
          stockage = '5 KWh';
        } else if (kitMatch[2] === '2') {
          stockage = '10 KWh';
        } else if (kitMatch[2] === '3') {
          stockage = '15 KWh';
        }
      }
    }
    let surfaceToiture = '-';
    let productionEstimee = '-';
    let prixBase = '-';
    let prixNet = '-';
    let consoCouverte = '-';
    let economieEDF = '-';
    let surplus = '-';
    let reventeSurplus = '-';
    let gainAnnuel = '-';
    let rentabilite = '-';
    let amortissement = '-';
    let gainMensuel = '-';
    // Production estimée depuis prodMoyenneKwh
    if (
      etude.prodMoyenneKwh !== undefined &&
      etude.prodMoyenneKwh !== null &&
      etude.prodMoyenneKwh !== ''
    ) {
      productionEstimee = `<b>${etude.prodMoyenneKwh}</b>`;
    }
    // Prix de base depuis prixCentrale
    if (
      etude.prixCentrale !== undefined &&
      etude.prixCentrale !== null &&
      etude.prixCentrale !== ''
    ) {
      prixBase = `<b>${etude.prixCentrale}</b>`;
    }
    // Prix net après prime
    const primeValueNum = Number(etude.primeEDF || etude.prime || 0);
    const prixBaseNum = Number(etude.prixCentrale || 0);
    if (prixBaseNum && primeValueNum) {
      prixNet = `<b>${(prixBaseNum - primeValueNum).toLocaleString()} €</b>`;
    } else if (prixBaseNum) {
      prixNet = `<b>${prixBaseNum.toLocaleString()} €</b>`;
    }
    // Conso couverte = 95% de la conso annuelle
    const consoAnnuelleNum = Number(etude.conso || etude.consoAnnuelle || 0);
    let consoCouverteNum = 0;
    if (consoAnnuelleNum) {
      consoCouverteNum = Number((consoAnnuelleNum * 0.95).toFixed(0));
      consoCouverte = `<b>${consoCouverteNum}</b>`;
    }
    // Économie EDF = conso couverte × 0,25
    if (consoCouverteNum) {
      economieEDF = `<b>${(consoCouverteNum * 0.25).toFixed(2)} €</b>`;
    }
    // Surplus = Production estimée - Conso couverte
    const productionEstimeeNum = Number(etude.prodMoyenneKwh || 0);
    if (productionEstimeeNum && consoCouverteNum) {
      surplus = `<b>${(productionEstimeeNum - consoCouverteNum).toFixed(
        2
      )}</b>`;
    }
    // Revente du surplus = Surplus × 0,1767
    if (productionEstimeeNum && consoCouverteNum) {
      const surplusNum = productionEstimeeNum - consoCouverteNum;
      reventeSurplus = `<b>${(surplusNum * 0.1767).toFixed(2)} €</b>`;
    }
    // Gain total annuel = ÉconomieEDF + ReventeSurplus
    const economieEDFNum = consoCouverteNum ? consoCouverteNum * 0.25 : 0;
    const reventeSurplusNum =
      productionEstimeeNum && consoCouverteNum
        ? (productionEstimeeNum - consoCouverteNum) * 0.1767
        : 0;
    if (economieEDFNum || reventeSurplusNum) {
      gainAnnuel = `<b>${(economieEDFNum + reventeSurplusNum).toFixed(
        2
      )} €</b>`;
    }
    // Rentabilité = GainAnnuel ÷ PrixNet
    const prixNetNum =
      prixBaseNum && primeValueNum ? prixBaseNum - primeValueNum : prixBaseNum;
    const gainAnnuelNum = economieEDFNum + reventeSurplusNum;
    if (gainAnnuelNum && prixNetNum) {
      rentabilite = `<b>${(gainAnnuelNum / prixNetNum).toFixed(2)}</b>`;
    }
    // Amortissement = PrixNet ÷ GainAnnuel (arrondi à l'entier le plus proche)
    if (prixNetNum && gainAnnuelNum) {
      amortissement = `<b>${Math.round(prixNetNum / gainAnnuelNum)} ans</b>`;
    }
    // Gain mensuel équivalent = GainAnnuel ÷ 12
    if (gainAnnuelNum) {
      gainMensuel = `<b>${(gainAnnuelNum / 12).toFixed(2)} €</b>`;
    }
    let mail = scriptMail
      .replace(/\[NomClient\]/g, `<b>${nomClient}</b>`)
      .replace(/\[Prime\]/g, primeValue ? `<b>${primeValue} €</b>` : '<b>-</b>')
      .replace(
        /\[ConsoAnnuelle\]/g,
        consoAnnuelle ? `<b>${consoAnnuelle}</b>` : '<b>-</b>'
      )
      .replace(
        /\[ConsoPrix\]/g,
        consoPrix ? `<b>${consoPrix} €</b>` : '<b>-</b>'
      )
      .replace(/\[ObjectifAutonomie\]/g, objectifAutonomie)
      .replace(/\[PuissanceCentrale\]/g, puissanceCentrale)
      .replace(/\[Stockage\]/g, stockage)
      .replace(/\[SurfaceToiture\]/g, surfaceToiture)
      .replace(/\[ProductionEstimee\]/g, productionEstimee)
      .replace(/\[PrixBase\]/g, prixBase)
      .replace(/\[PrixNet\]/g, prixNet)
      .replace(/\[ConsoCouverte\]/g, consoCouverte)
      .replace(/\[EconomieEDF\]/g, economieEDF)
      .replace(/\[Surplus\]/g, surplus)
      .replace(/\[ReventeSurplus\]/g, reventeSurplus)
      .replace(/\[GainAnnuel\]/g, gainAnnuel)
      .replace(/\[Rentabilite\]/g, rentabilite)
      .replace(/\[Amortissement\]/g, amortissement)
      .replace(/\[GainMensuel\]/g, gainMensuel);
    // Calcul pour la rentabilité et le gain total sur 20 ans
    let rentabiliteTable = null;
    let anneeRentable = null;
    let gainTotal20ans = null;
    Object.entries(etude).forEach(([key, value]) => {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        ('annee' in value[0] ||
          'coutEdf' in value[0] ||
          'mensualiteEdf' in value[0])
      ) {
        // Calcul du nombre d'années en négatif avant de passer en positif
        let cumul = 0;
        for (let i = 0; i < value.length; i++) {
          const diff = Number(value[i].diff) || 0;
          const revente = Number(value[i].reventeEstimee) || 0;
          const total = diff + revente;
          if (total < 0) cumul++;
          else break;
        }
        anneeRentable = cumul + 1; // On passe en positif à l'année suivante
        // Calcul du gain total sur 20 ans
        const totalDiff = value.reduce(
          (sum, row) => sum + (Number(row.diff) || 0),
          0
        );
        const totalRevente = value.reduce(
          (sum, row) => sum + (Number(row.reventeEstimee) || 0),
          0
        );
        gainTotal20ans = (totalDiff + totalRevente).toLocaleString() + ' €';
      }
    });
    mail = mail.replace(
      /(Analyse financière[\s\S]*?)(\n\n|$)/,
      (match, p1, p2) => {
        let extra = '';
        if (anneeRentable) {
          extra += `\nProjet rentable en <b style='color:#16a34a;'>${anneeRentable} ans</b>`;
        }
        if (gainTotal20ans) {
          extra += `\nEconomie et gain total en 20 ans <b style='color:#16a34a;font-size:18px;'>${gainTotal20ans}</b>`;
        }
        return p1 + extra + '\n' + (p2 || '');
      }
    );
    // Ajout du tableau de rentabilité si demandé
    if (includeTableInMail && rentabiliteTable) {
      mail +=
        '\n\nTableau de rentabilité :<br />' +
          rentabiliteTable.props.children.props.children.props
            .dangerouslySetInnerHTML?.__html || '';
    }
    // Calcul des pourcentages pour jauge
    let pourcentageUtilisation = 0;
    let pourcentageSurplus = 0;
    if (productionEstimeeNum > 0) {
      pourcentageUtilisation = (
        (consoCouverteNum / productionEstimeeNum) *
        100
      ).toFixed(1);
      pourcentageSurplus = (
        ((productionEstimeeNum - consoCouverteNum) / productionEstimeeNum) *
        100
      ).toFixed(1);
    }
    // Ajout des tags/jauges HTML stylisés avant le texte principal du mail
    mail =
      getTagsJaugesHtml(etude, {
        production: productionEstimee,
        anneeRentabilite: anneeRentable,
      }) +
      '\n' +
      mail;
    // Suppression des guillemets autour des données dynamiques dans le mail
    mail = mail.replace(/«\s*([^»]+)\s*»/g, '$1');
    setMailContent(mail);
  }, [
    selectedClient,
    clients,
    scriptMail,
    includeTableInMail,
    selectedEtudesIdx,
  ]);

  // Affichage des PDF enregistrés pour l'utilisateur (tous devis PDF)
  useEffect(() => {
    const fetchUserPdfs = async () => {
      if (!user) return;
      const db = getFirestore(getApp());
      const snapshot = await getDocs(collection(db, 'devis'));
      const pdfs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => d.type === 'pdf' && d.userId === user.uid);
      setClientDevis(pdfs);
    };
    fetchUserPdfs();
  }, [user]);

  // Correction : recharge la liste des clients à chaque fois que l'utilisateur est prêt
  useEffect(() => {
    if (!user) return;
    setLoadingClients(true);
    const fetchClients = async () => {
      const db = getFirestore(getApp());
      const snapshot = await getDocs(collection(db, 'clients'));
      let userClients = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((c) => c.email === user?.email);
      setClients(userClients);
      setLoadingClients(false);
    };
    fetchClients();
  }, [user]);

  // Correction : recharge la liste des PDF à chaque fois que l'utilisateur est prêt
  useEffect(() => {
    if (!user) return;
    const fetchUserPdfs = async () => {
      const db = getFirestore(getApp());
      const snapshot = await getDocs(collection(db, 'devis'));
      const pdfs = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((d) => d.type === 'pdf' && d.userId === user.uid);
      setClientDevis(pdfs);
    };
    fetchUserPdfs();
  }, [user]);

  // Pré-remplit le champ email du client lors de la sélection dans le formulaire du mail récapitulatif
  useEffect(() => {
    if (!selectedClient) return;
    const client = clients.find((c) => c.id === selectedClient);
    if (client && client.email) {
      setMailFields((f) => ({ ...f, email: client.email }));
    }
  }, [selectedClient, clients]);

  // Génère automatiquement le mail récapitulatif à chaque changement de client ou de champs
  useEffect(() => {
    if (!selectedClient) {
      setMailContent('');
      return;
    }
    const client = clients.find((c) => c.id === selectedClient);
    let etude = null;
    if (
      client?.etudes &&
      Array.isArray(client.etudes) &&
      client.etudes.length > 0
    ) {
      etude =
        client.etudes.find((e) => e.modePaiement === 'comptant') ||
        client.etudes[0];
    } else if (
      client?.Etude &&
      Array.isArray(client.Etude) &&
      client.Etude.length > 0
    ) {
      etude =
        client.Etude.find((e) => e.modePaiement === 'comptant') ||
        client.Etude[0];
    } else if (client?.etudePerso) {
      etude = client.etudePerso;
    } else {
      etude = {};
    }
    const primeValue = etude.primeEDF || etude.prime || '';
    const nomClient =
      (client?.nom || '') + (client?.prenom ? ' ' + client.prenom : '');
    const consoAnnuelle = Number(etude.conso || etude.consoAnnuelle || 0);
    const consoPrix = consoAnnuelle ? (consoAnnuelle * 0.25).toFixed(2) : '';
    const objectifAutonomie = '<b>95%</b>';
    let puissanceCentrale = '-';
    let stockage = '-';
    let surfaceToiture = '-';
    let productionEstimee = '-';
    let prixBase = '-';
    let prixNet = '-';
    let consoCouverte = '-';
    let economieEDF = '-';
    let surplus = '-';
    let reventeSurplus = '-';
    let gainAnnuel = '-';
    let rentabilite = '-';
    let amortissement = '-';
    let gainMensuel = '-';
    if (etude.kit) {
      const kitMatch = String(etude.kit).match(/(\d+)KWh-(\d+)/);
      if (kitMatch) {
        puissanceCentrale = `<b>${kitMatch[1]}KWh</b>`;
        stockage =
          kitMatch[2] === '1'
            ? '<b>5KWh</b>'
            : kitMatch[2] === '2'
            ? '<b>10KWh</b>'
            : kitMatch[2] === '3'
            ? '<b>15KWh</b>'
            : '<b>-</b>';
        surfaceToiture =
          kitMatch[1] === '3'
            ? '<b>15m²</b>'
            : kitMatch[1] === '6'
            ? '<b>30m²</b>'
            : kitMatch[1] === '9'
            ? '<b>45m²</b>'
            : kitMatch[1] === '12'
            ? '<b>60m²</b>'
            : '<b>-</b>';
      }
    }
    if (
      etude.prodMoyenneKwh !== undefined &&
      etude.prodMoyenneKwh !== null &&
      etude.prodMoyenneKwh !== ''
    ) {
      productionEstimee = `<b>${etude.prodMoyenneKwh}</b>`;
    }
    if (
      etude.prixCentrale !== undefined &&
      etude.prixCentrale !== null &&
      etude.prixCentrale !== ''
    ) {
      prixBase = `<b>${etude.prixCentrale}</b>`;
    }
    const primeValueNum = Number(etude.primeEDF || etude.prime || 0);
    const prixBaseNum = Number(etude.prixCentrale || 0);
    if (prixBaseNum && primeValueNum) {
      prixNet = `<b>${(prixBaseNum - primeValueNum).toLocaleString()} €</b>`;
    } else if (prixBaseNum) {
      prixNet = `<b>${prixBaseNum.toLocaleString()} €</b>`;
    }
    const consoAnnuelleNum = Number(etude.conso || etude.consoAnnuelle || 0);
    let consoCouverteNum = 0;
    if (consoAnnuelleNum) {
      consoCouverteNum = Number((consoAnnuelleNum * 0.95).toFixed(0));
      consoCouverte = `<b>${consoCouverteNum}</b>`;
    }
    if (consoCouverteNum) {
      economieEDF = `<b>${(consoCouverteNum * 0.25).toFixed(2)} €</b>`;
    }
    // Surplus = Production estimée - Conso couverte
    const productionEstimeeNum = Number(etude.prodMoyenneKwh || 0);
    if (productionEstimeeNum && consoCouverteNum) {
      surplus = `<b>${(productionEstimeeNum - consoCouverteNum).toFixed(
        2
      )}</b>`;
    }
    // Revente du surplus = Surplus × 0,1767
    if (productionEstimeeNum && consoCouverteNum) {
      const surplusNum = productionEstimeeNum - consoCouverteNum;
      reventeSurplus = `<b>${(surplusNum * 0.1767).toFixed(2)} €</b>`;
    }
    const economieEDFNum = consoCouverteNum ? consoCouverteNum * 0.25 : 0;
    const reventeSurplusNum =
      productionEstimeeNum && consoCouverteNum
        ? (productionEstimeeNum - consoCouverteNum) * 0.1767
        : 0;
    if (economieEDFNum || reventeSurplusNum) {
      gainAnnuel = `<b>${(economieEDFNum + reventeSurplusNum).toFixed(
        2
      )} €</b>`;
    }
    const prixNetNum =
      prixBaseNum && primeValueNum ? prixBaseNum - primeValueNum : prixBaseNum;
    const gainAnnuelNum = economieEDFNum + reventeSurplusNum;
    if (gainAnnuelNum && prixNetNum) {
      rentabilite = `<b>${(gainAnnuelNum / prixNetNum).toFixed(2)}</b>`;
    }
    // Amortissement = PrixNet ÷ GainAnnuel (arrondi à l'entier le plus proche)
    if (prixNetNum && gainAnnuelNum) {
      amortissement = `<b>${Math.round(prixNetNum / gainAnnuelNum)} ans</b>`;
    }
    // Gain mensuel équivalent = GainAnnuel ÷ 12
    if (gainAnnuelNum) {
      gainMensuel = `<b>${(gainAnnuelNum / 12).toFixed(2)} €</b>`;
    }
    let mail = scriptMail
      .replace(/\[NomClient\]/g, `<b>${nomClient}</b>`)
      .replace(/\[Prime\]/g, primeValue ? `<b>${primeValue} €</b>` : '<b>-</b>')
      .replace(
        /\[ConsoAnnuelle\]/g,
        consoAnnuelle ? `<b>${consoAnnuelle}</b>` : '<b>-</b>'
      )
      .replace(
        /\[ConsoPrix\]/g,
        consoPrix ? `<b>${consoPrix} €</b>` : '<b>-</b>'
      )
      .replace(/\[ObjectifAutonomie\]/g, objectifAutonomie)
      .replace(/\[PuissanceCentrale\]/g, puissanceCentrale)
      .replace(/\[Stockage\]/g, stockage)
      .replace(/\[SurfaceToiture\]/g, surfaceToiture)
      .replace(/\[ProductionEstimee\]/g, productionEstimee)
      .replace(/\[PrixBase\]/g, prixBase)
      .replace(/\[PrixNet\]/g, prixNet)
      .replace(/\[ConsoCouverte\]/g, consoCouverte)
      .replace(/\[EconomieEDF\]/g, economieEDF)
      .replace(/\[Surplus\]/g, surplus)
      .replace(/\[ReventeSurplus\]/g, reventeSurplus)
      .replace(/\[GainAnnuel\]/g, gainAnnuel)
      .replace(/\[Rentabilite\]/g, rentabilite)
      .replace(/\[Amortissement\]/g, amortissement)
      .replace(/\[GainMensuel\]/g, gainMensuel);
    // Calcul pour la rentabilité et le gain total sur 20 ans
    let rentabiliteTable = null;
    let anneeRentable = null;
    let gainTotal20ans = null;
    Object.entries(etude).forEach(([key, value]) => {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        ('annee' in value[0] ||
          'coutEdf' in value[0] ||
          'mensualiteEdf' in value[0])
      ) {
        // Calcul du nombre d'années en négatif avant de passer en positif
        let cumul = 0;
        for (let i = 0; i < value.length; i++) {
          const diff = Number(value[i].diff) || 0;
          const revente = Number(value[i].reventeEstimee) || 0;
          const total = diff + revente;
          if (total < 0) cumul++;
          else break;
        }
        anneeRentable = cumul + 1; // On passe en positif à l'année suivante
        // Calcul du gain total sur 20 ans
        const totalDiff = value.reduce(
          (sum, row) => sum + (Number(row.diff) || 0),
          0
        );
        const totalRevente = value.reduce(
          (sum, row) => sum + (Number(row.reventeEstimee) || 0),
          0
        );
        gainTotal20ans = (totalDiff + totalRevente).toLocaleString() + ' €';
      }
    });
    // Suppression des guillemets autour des données dynamiques dans le mail
    mail = mail.replace(/«\s*([^»]+)\s*»/g, '$1');
    // Ajoute SEULEMENT le tableau HTML sauvegardé à la fin du mail (si demandé),
    // les tags/jauges restent uniquement au début via le scriptMail
    // Récupère les études sélectionnées pour le mail
    let etudes = [];
    if (
      client.etudes &&
      Array.isArray(client.etudes) &&
      client.etudes.length > 0
    ) {
      etudes = client.etudes;
    } else if (client.etudePerso) {
      etudes = [client.etudePerso];
    }
    const selectedEtudes =
      selectedEtudesIdx.length > 0
        ? selectedEtudesIdx.map((idx) => etudes[idx])
        : [etudes[0]];
    if (
      includeTableInMail &&
      Array.isArray(selectedEtudes) &&
      selectedEtudes.length > 0
    ) {
      selectedEtudes.forEach((etude, idx) => {
        if (etude && etude.tableauRentabiliteHtml) {
          mail += '<br />' + etude.tableauRentabiliteHtml;
          // Ajout des images des graphiques pour chaque étude
          // On suppose que chaque graphique a un ref unique par étude (ex: chartKwhRoiRef[idx])
          // Si ce n'est pas le cas, on récupère le canvas du DOM par une classe ou un id unique
          const roiCanvas = document.querySelector(
            `#chartKwhRoi-${idx} canvas`
          );
          const barCanvas = document.querySelector(
            `#chartRentabiliteBar-${idx} canvas`
          );
          const breakEvenCanvas = document.querySelector(
            `#chartBreakEven-${idx} canvas`
          );
          // Mise en page : 2 graphiques côte à côte, le 3e en dessous et plus grand
          let graphRow =
            '<div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;margin:24px 0;">';
          if (roiCanvas) {
            graphRow += `<div style="flex:1 1 600px;max-width:700px;"><img src="${roiCanvas.toDataURL()}" style="width:100%;min-width:400px;max-width:700px;border-radius:18px;box-shadow:0 4px 24px #0003;" alt="Graphique ROI/kWh" /></div>`;
          }
          if (barCanvas) {
            graphRow += `<div style="flex:1 1 600px;max-width:700px;"><img src="${barCanvas.toDataURL()}" style="width:100%;min-width:400px;max-width:700px;border-radius:18px;box-shadow:0 4px 24px #0003;" alt="Graphique économies cumulées" /></div>`;
          }
          graphRow += '</div>';
          if (breakEvenCanvas) {
            graphRow += `<div style=\"margin:40px auto;max-width:900px;\"><img src=\"${breakEvenCanvas.toDataURL()}\" style=\"width:100%;min-width:600px;max-width:900px;border-radius:24px;box-shadow:0 6px 32px #0004;\" alt=\"Graphique break-even\" /></div>`;
          }
          mail += graphRow;
        }
      });
    }
    setMailContent(mail);
  }, [selectedClient, clients, scriptMail, includeTableInMail]);

  // Fonction utilitaire pour générer le HTML du tableau de rentabilité
  function getRentabiliteTableHtml(etude) {
    let rentabiliteHtml = '';
    Object.entries(etude).forEach(([key, value]) => {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        ('annee' in value[0] ||
          'coutEdf' in value[0] ||
          'mensualiteEdf' in value[0])
      ) {
        // Colonnes à afficher
        const columns = [
          { key: 'annee', label: 'Année' },
          { key: 'coutEdf', label: 'Coût EDF (€)' },
          { key: 'mensualiteEdf', label: 'Mensualité EDF (€)' },
          { key: 'coutCentrale', label: 'Coût centrale (€)' },
          { key: 'mensualiteCentrale', label: 'Mensualité centrale (€)' },
          { key: 'reventeEstimee', label: 'Revente estimée (€)' },
          { key: 'diff', label: 'Différence (€)' },
          { key: 'diffPlusRevente', label: 'Différence + Revente estimée (€)' },
          { key: 'prixEdfCts', label: 'Prix EDF (cts)' },
        ];
        // Calcul des totaux sur 20 ans
        const totalCoutEdf = value.reduce(
          (sum, row) => sum + (Number(row.coutEdf) || 0),
          0
        );
        const totalCentrale = value.reduce(
          (sum, row) => sum + (Number(row.coutCentrale) || 0),
          0
        );
        const totalRevente = value.reduce(
          (sum, row) => sum + (Number(row.reventeEstimee) || 0),
          0
        );
        const totalDiff = value.reduce(
          (sum, row) => sum + (Number(row.diff) || 0),
          0
        );
        rentabiliteHtml += `<table style='margin:12px 0;border-collapse:collapse;background:#f3f4f6;border-radius:6;width:100%;'>`;
        rentabiliteHtml += `<thead><tr>`;
        columns.forEach((col) => {
          rentabiliteHtml += `<th style='border:1px solid #d1d5db;padding:6px 12px;font-weight:600;background:#e0e7ff;color:#2563eb;'>${col.label}</th>`;
        });
        rentabiliteHtml += `</tr></thead><tbody>`;
        value.forEach((row) => {
          rentabiliteHtml += `<tr>`;
          columns.forEach((col) => {
            let cellValue = row[col.key] !== undefined ? row[col.key] : '-';
            let style = `border:1px solid #d1d5db;padding:6px 12px;font-size:15px;`;
            if (col.key === 'diff') {
              if (Number(row[col.key]) >= 0)
                style += 'color:#16a34a;font-weight:700;';
            }
            if (col.key === 'mensualiteCentrale') {
              const centrale = Number(row[col.key]);
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
              cellValue = `${(diff + revente).toLocaleString()} €`;
              style += 'color:#0e7490;font-weight:700;';
            }
            rentabiliteHtml += `<td style='${style}'>${cellValue}</td>`;
          });
          rentabiliteHtml += `</tr>`;
        });
        // Ligne des totaux sur 20 ans
        rentabiliteHtml += `<tr style='background:#e0e7ff;font-weight:700;'><td colspan='${columns.length}' style='text-align:center;color:#2563eb;'>Totaux sur 20 ans</td></tr>`;
        rentabiliteHtml += `<tr style='background:#f3f4f6;font-weight:700;'><td></td><td style='color:#dc2626;font-weight:700;'>${totalCoutEdf.toLocaleString()} €</td><td></td><td>${totalCentrale.toLocaleString()} €</td><td></td><td>${totalRevente.toLocaleString()} €</td><td>${totalDiff.toLocaleString()} €</td><td></td></tr>`;
        rentabiliteHtml += `<tr><td colspan='${
          columns.length
        }' style='text-align:center;padding:18px 0;'><div style='font-size:22px;font-weight:700;color:#16a34a;background:#e0ffe0;border-radius:8px;display:inline-block;padding:12px 32px;margin-top:8px;'>Economie et gain total sur 20 ans : ${(
          totalDiff + totalRevente
        ).toLocaleString()} €</div></td></tr>`;
        rentabiliteHtml += `</tbody></table>`;
      }
    });
    return rentabiliteHtml;
  }

  // Fonction utilitaire pour affichage récursif
  function renderValue(value, etude) {
    if (value === null || value === undefined || value === '')
      return <span>-</span>;
    // Affichage spécial pour le tableau de rentabilité
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      typeof value[0] === 'object' &&
      value[0] !== null &&
      ('annee' in value[0] ||
        'coutEdf' in value[0] ||
        'mensualiteEdf' in value[0])
    ) {
      // Colonnes à afficher : toujours identiques à celles du Calculateur, même pour paiement comptant
      let columns = [
        { key: 'annee', label: 'Année' },
        { key: 'coutEdf', label: 'Coût EDF (€)' },
        { key: 'mensualiteEdf', label: 'Mensualité EDF (€)' },
        { key: 'coutCentrale', label: 'Coût centrale (€)' },
        { key: 'mensualiteCentrale', label: 'Mensualité centrale (€)' },
        { key: 'reventeEstimee', label: 'Revente estimée (€)' },
        { key: 'diff', label: 'Différence (€)' },
        { key: 'cumul', label: 'Retour sur investissement' },
        { key: 'diffPlusRevente', label: 'Différence + Revente estimée (€)' },
        { key: 'prixEdfCts', label: 'Prix EDF (cts)' },
      ];
      // Calcul des totaux sur 20 ans
      const totalCoutEdf = value.reduce(
        (sum, row) => sum + (Number(row.coutEdf) || 0),
        0
      );
      const totalCentrale = value.reduce(
        (sum, row) => sum + (Number(row.coutCentrale) || 0),
        0
      );
      const totalRevente = value.reduce(
        (sum, row) => sum + (Number(row.reventeEstimee) || 0),
        0
      );
      const totalDiff = value.reduce(
        (sum, row) => sum + (Number(row.diff) || 0),
        0
      );
      // Calcul du cumul des différences (retour sur investissement)
      let cumul = 0;
      const rowsWithCumul = value.map((row, idx) => {
        cumul += Number(row.diff) || 0;
        return { ...row, cumul };
      });
      return (
        <table
          style={{
            margin: '12px 0',
            borderCollapse: 'collapse',
            background: '#f3f4f6',
            borderRadius: 6,
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    border: '1px solid #d1d5db',
                    padding: '6px 12px',
                    fontWeight: 600,
                    background: '#e0e7ff',
                    color: '#2563eb',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsWithCumul.map((row, idx) => (
              <tr key={idx}>
                {columns.map((col) => {
                  // Affichage spécial pour paiement comptant : coutCentrale = 0
                  if (
                    etude &&
                    etude.modePaiement === 'comptant' &&
                    col.key === 'coutCentrale'
                  ) {
                    return (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #d1d5db',
                          padding: '6px 12px',
                          fontSize: 15,
                        }}
                      >
                        0
                      </td>
                    );
                  }
                  // Colonne cumul : retour sur investissement
                  if (col.key === 'cumul') {
                    const isPositive = Number(row.cumul) >= 0;
                    return (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #d1d5db',
                          padding: '6px 12px',
                          fontSize: 15,
                          color: isPositive ? '#16a34a' : '#dc2626',
                          fontWeight: 700,
                        }}
                      >
                        {row.cumul.toLocaleString()} €
                      </td>
                    );
                  }
                  // Mise en vert de la différence dès qu'elle devient positive
                  if (col.key === 'diff') {
                    const isPositive = Number(row[col.key]) >= 0;
                    return (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #d1d5db',
                          padding: '6px 12px',
                          fontSize: 15,
                          color: isPositive ? '#16a34a' : undefined,
                          fontWeight: isPositive ? 700 : undefined,
                        }}
                      >
                        {row[col.key] !== undefined ? row[col.key] : '-'}
                      </td>
                    );
                  }
                  // Mise en vert de la mensualité centrale si elle est inférieure à la mensualité EDF
                  if (col.key === 'mensualiteCentrale') {
                    const centrale = Number(row[col.key]);
                    const edf = Number(row['mensualiteEdf']);
                    const isLower =
                      !isNaN(centrale) && !isNaN(edf) && centrale < edf;
                    return (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #d1d5db',
                          padding: '6px 12px',
                          fontSize: 15,
                          color: isLower ? '#16a34a' : undefined,
                          fontWeight: isLower ? 700 : undefined,
                        }}
                      >
                        {row[col.key] !== undefined ? row[col.key] : '-'}
                      </td>
                    );
                  }
                  // Mise en doré et en gras pour la colonne 'Revente estimée (€)'
                  if (col.key === 'reventeEstimee') {
                    return (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #d1d5db',
                          padding: '6px 12px',
                          fontSize: 15,
                          color: '#bfa100',
                          fontWeight: 700,
                        }}
                      >
                        {row[col.key] !== undefined ? row[col.key] : '-'}
                      </td>
                    );
                  }
                  // Nouvelle colonne : Différence + Revente estimée
                  if (col.key === 'diffPlusRevente') {
                    const diff = Number(row['diff']) || 0;
                    const revente = Number(row['reventeEstimee']) || 0;
                    const total = diff + revente;
                    return (
                      <td
                        key={col.key}
                        style={{
                          border: '1px solid #d1d5db',
                          padding: '6px 12px',
                          fontSize: 15,
                          color: '#0e7490',
                          fontWeight: 700,
                        }}
                      >
                        {total.toLocaleString()} €
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.key}
                      style={{
                        border: '1px solid #d1d5db',
                        padding: '6px 12px',
                        fontSize: 15,
                      }}
                    >
                      {row[col.key] !== undefined ? row[col.key] : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* Ligne des totaux sur 20 ans */}
            <tr style={{ background: '#e0e7ff', fontWeight: 700 }}>
              <td
                colSpan={columns.length}
                style={{ textAlign: 'center', color: '#2563eb' }}
              >
                Totaux sur 20 ans
              </td>
            </tr>
            <tr style={{ background: '#f3f4f6', fontWeight: 700 }}>
              {/* Affichage spécial pour paiement comptant : coutCentrale total = 0 */}
              {columns.map((col, idx) => {
                if (
                  etude &&
                  etude.modePaiement === 'comptant' &&
                  col.key === 'coutCentrale'
                ) {
                  return <td key={col.key}>0</td>;
                }
                if (col.key === 'coutEdf') {
                  return (
                    <td
                      key={col.key}
                      style={{ color: '#dc2626', fontWeight: 700 }}
                    >
                      {totalCoutEdf.toLocaleString()} €
                    </td>
                  );
                }
                if (col.key === 'reventeEstimee') {
                  return (
                    <td key={col.key}>{totalRevente.toLocaleString()} €</td>
                  );
                }
                if (col.key === 'diff') {
                  return <td key={col.key}>{totalDiff.toLocaleString()} €</td>;
                }
                return <td key={col.key}></td>;
              })}
            </tr>
            {/* Nouvelle case économie et gain total sur 20 ans */}
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: 'center', padding: '18px 0' }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: '#16a34a',
                    background: '#e0ffe0',
                    borderRadius: 8,
                    display: 'inline-block',
                    padding: '12px 32px',
                    marginTop: 8,
                  }}
                >
                  Economie et gain total sur 20 ans :{' '}
                  {(totalDiff + totalRevente).toLocaleString()} €
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return (
          <ul
            style={{
              marginLeft: 12,
              paddingLeft: 12,
              background: '#f3f4f6',
              borderRadius: 4,
            }}
          >
            {value.map((item, idx) => (
              <li key={idx} style={{ fontSize: 14 }}>
                {renderValue(item)}
              </li>
            ))}
          </ul>
        );
      } else {
        return (
          <ul
            style={{
              marginLeft: 12,
              paddingLeft: 12,
              background: '#f3f4f6',
              borderRadius: 4,
            }}
          >
            {Object.entries(value).map(([subKey, subValue]) => (
              <li key={subKey} style={{ fontSize: 14 }}>
                <span style={{ fontWeight: 400 }}>{subKey} :</span>{' '}
                {renderValue(subValue)}
              </li>
            ))}
          </ul>
        );
      }
    }
    return <span>{value}</span>;
  }

  // Fonction pour envoyer le mail réel via l'API Node.js
  const handleSendMail = async () => {
    if (!selectedClient || !mailFields.email || !mailContent || !smtpPassword) {
      alert(
        'Veuillez sélectionner un client, remplir l’email et le mot de passe de votre boîte mail.'
      );
      return;
    }
    try {
      let pdfBase64 = null;
      if (pdfPreview) {
        // Conversion du PDF en base64
        const response = await fetch(pdfPreview);
        const blob = await response.blob();
        pdfBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      // Correction : n'ajoute pas le tableau de rentabilité une deuxième fois si déjà présent dans mailContent
      let htmlContent = mailContent.replace(/\n/g, '<br />');
      await fetch('/api/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: mailFields.email,
          subject: 'Votre proposition photovoltaïque',
          html: htmlContent, // Utilise le contenu HTML enrichi
          pdfBase64,
          from: user?.email || undefined,
          smtpUser: user?.email || undefined,
          smtpPass: smtpPassword,
        }),
      });
      alert('Mail envoyé au client : ' + mailFields.email);
    } catch (err) {
      // Affiche un message spécifique si le mot de passe SMTP est incorrect
      const errMsg = err?.message || String(err);
      if (
        errMsg.toLowerCase().includes('auth') ||
        errMsg.toLowerCase().includes('authentication failed') ||
        errMsg.toLowerCase().includes('535')
      ) {
        alert(
          'Mot de passe de la boîte mail incorrect ou refusé par le serveur SMTP.'
        );
      } else {
        alert('Erreur lors de l’envoi du mail : ' + errMsg);
      }
    }
  };



  return (
    <div style={{ padding: 32 }}>
      <h2>Faire une proposition</h2>
      <p>
        Importez un devis (Excel ou CSV), modifiez-le et associez-le à un
        client.
      </p>
      <div style={{ marginBottom: 16, maxWidth: 400 }}>
        <label style={{ fontWeight: 600, marginRight: 12 }}>
          Associer à un client :
        </label>
        <input
          type="text"
          value={searchClient}
          onChange={(e) => setSearchClient(e.target.value)}
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
              (c.nom || '')
                .toLowerCase()
                .includes(searchClient.toLowerCase()) ||
              (c.prenom || '')
                .toLowerCase()
                .includes(searchClient.toLowerCase())
          ).length === 0 ? (
            <div style={{ padding: 8, color: '#64748b' }}>
              Aucun client trouvé.
            </div>
          ) : (
            clients
              .filter(
                (c) =>
                  (c.nom || '')
                    .toLowerCase()
                    .includes(searchClient.toLowerCase()) ||
                  (c.prenom || '')
                    .toLowerCase()
                    .includes(searchClient.toLowerCase())
              )
              .map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: 8,
                    borderBottom: '1px solid #e0e7ff',
                    cursor: 'pointer',
                    background: selectedClient === c.id ? '#dbeafe' : '#fff',
                  }}
                  onClick={() => setSelectedClient(c.id)}
                >
                  <b>
                    {c.nom} {c.prenom}
                  </b>{' '}
                  — {c.email}
                </div>
              ))
          )}
        </div>
        {loadingClients && <span style={{ marginLeft: 8 }}>Chargement...</span>}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 32,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, minWidth: 280, maxWidth: 520 }}>
          {/* Résumé client à gauche + Sélection études (multi) */}
          {selectedClient && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: 8,
                padding: 16,
                boxShadow: '0 2px 8px #2563eb22',
              }}
            >
              <h4 style={{ marginTop: 0, marginBottom: 8, color: '#2563eb' }}>
                Résumé client
              </h4>
              {(() => {
                const client = clients.find((c) => c.id === selectedClient);
                if (!client) return null;
                let etudes = [];
                if (
                  client.etudes &&
                  Array.isArray(client.etudes) &&
                  client.etudes.length > 0
                ) {
                  etudes = client.etudes;
                } else if (client.etudePerso) {
                  etudes = [client.etudePerso];
                }
                if (etudes.length > 0) {
                  return (
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#2563eb',
                          marginBottom: 8,
                        }}
                      >
                        Sélectionnez les études à inclure dans la proposition :
                      </div>
                      <div
                        style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
                      >
                        {etudes.map((etude, idx) => {
                          const selected = selectedEtudesIdx.includes(idx);
                          return (
                            <div
                              key={idx}
                              onClick={() => {
                                setSelectedEtudesIdx((prev) =>
                                  selected
                                    ? prev.filter((i) => i !== idx)
                                    : [...prev, idx]
                                );
                              }}
                              style={{
                                minWidth: 180,
                                maxWidth: 220,
                                background: selected ? '#e0e7ff' : '#fff',
                                border: selected
                                  ? '2px solid #2563eb'
                                  : '1px solid #d1d5db',
                                borderRadius: 8,
                                boxShadow: selected
                                  ? '0 2px 8px #2563eb22'
                                  : 'none',
                                cursor: 'pointer',
                                padding: 12,
                                marginBottom: 8,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                position: 'relative',
                              }}
                            >
                              {/* Coche visuelle */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                }}
                              >
                                {selected && (
                                  <span
                                    style={{ fontSize: 22, color: '#2563eb' }}
                                  >
                                    ✔️
                                  </span>
                                )}
                              </div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: '#2563eb',
                                  marginBottom: 4,
                                }}
                              >
                                {etude.nomEtude ||
                                  etude.modePaiement ||
                                  `Étude ${idx + 1}`}
                              </div>
                              <div style={{ fontSize: 14, marginBottom: 2 }}>
                                <b>Puissance :</b>{' '}
                                {etude.kit
                                  ? String(etude.kit).split('-')[0]
                                  : '-'}
                              </div>
                              <div style={{ fontSize: 14, marginBottom: 2 }}>
                                <b>Stockage :</b>{' '}
                                {etude.kit
                                  ? String(etude.kit).split('-')[1] === '1'
                                    ? '5KWh'
                                    : String(etude.kit).split('-')[1] === '2'
                                    ? '10KWh'
                                    : '-'
                                  : '-'}
                              </div>
                              <div style={{ fontSize: 14, marginBottom: 2 }}>
                                <b>Production annuelle :</b>{' '}
                                {etude.prodMoyenneKwh || '-'} kWh
                              </div>
                              <div style={{ fontSize: 14, marginBottom: 2 }}>
                                <b>Rentabilité :</b>{' '}
                                {etude.anneeRentable ||
                                  etude.amortissement ||
                                  '-'}
                              </div>
                              <div style={{ fontSize: 14, marginBottom: 2 }}>
                                <b>Gain total 20 ans :</b>{' '}
                                {etude.totalCumul
                                  ? `${Number(
                                      etude.totalCumul
                                    ).toLocaleString()} €`
                                  : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Affichage résumé des études sélectionnées */}
              {(() => {
                const client = clients.find((c) => c.id === selectedClient);
                if (!client) return null;
                let etudes = [];
                if (
                  client.Etude &&
                  Array.isArray(client.Etude) &&
                  client.Etude.length > 0
                ) {
                  etudes = client.Etude;
                } else if (client.etudePerso) {
                  etudes = [client.etudePerso];
                }
                const selectedEtudes =
                  selectedEtudesIdx.length > 0
                    ? selectedEtudesIdx.map((idx) => etudes[idx])
                    : [etudes[0]];
                return selectedEtudes.map((etude, i) => {
                  if (!etude) return null;
                  return (
                    <ul
                      key={i}
                      style={{
                        paddingLeft: 0,
                        listStyle: 'none',
                        marginBottom: 12,
                      }}
                    >
                      <li>
                        <b>Nom :</b> {client.nom} {client.prenom}
                      </li>
                      <li>
                        <b>Email :</b> {client.email}
                      </li>
                      <li>
                        <b>Téléphone :</b> {client.telephone}
                      </li>
                      <li>
                        <b>Adresse :</b> {client.adresse} {client.ville}
                      </li>
                      <hr style={{ margin: '12px 0' }} />
                      <div
                        style={{
                          fontWeight: 600,
                          color: '#2563eb',
                          marginBottom: 6,
                        }}
                      >
                        Étude calculateur
                      </div>
                      {Object.keys(etude).length === 0 && (
                        <div style={{ color: '#ef4444' }}>
                          Aucune étude enregistrée pour ce client.
                        </div>
                      )}
                      <li>
                        <span style={{ fontWeight: 500 }}>
                          Puissance centrale :
                        </span>{' '}
                        {etude.kit ? String(etude.kit).split('-')[0] : '-'}
                      </li>
                      <li>
                        <span style={{ fontWeight: 500 }}>Stockage :</span>{' '}
                        {etude.kit
                          ? String(etude.kit).split('-')[1] === '1'
                            ? '5KWh'
                            : String(etude.kit).split('-')[1] === '2'
                            ? '10KWh'
                            : '-'
                          : '-'}
                      </li>
                      {/* ...autres données si besoin... */}
                    </ul>
                  );
                });
              })()}
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 320 }}>
          {/* Tableau de rentabilité à droite + graphiques pour chaque étude sélectionnée */}
          {selectedClient &&
            (() => {
              const client = clients.find((c) => c.id === selectedClient);
              if (!client) return null;
              let etudes = [];
              if (
                client.etudes &&
                Array.isArray(client.etudes) &&
                client.etudes.length > 0
              ) {
                etudes = client.etudes;
              } else if (client.etudePerso) {
                etudes = [client.etudePerso];
              }
              const selectedEtudes =
                selectedEtudesIdx.length > 0
                  ? selectedEtudesIdx.map((idx) => etudes[idx])
                  : [etudes[0]];
              return selectedEtudes.map((etude, i) => {
                // Sécurisation de l'accès à rentabilite
                const rentabiliteArr = Array.isArray(etude?.rentabilite)
                  ? etude.rentabilite
                  : [];
                return (
                  <div key={i} style={{ marginBottom: 32 }}>
                    {etude &&
                    typeof etude.tableauRentabiliteHtml === 'string' &&
                    etude.tableauRentabiliteHtml.length > 0 ? (
                      <div>
                        <h4 style={{ color: '#2563eb', marginBottom: 8 }}>
                          Tableau de rentabilité
                        </h4>
                        <div
                          dangerouslySetInnerHTML={{
                            __html: etude.tableauRentabiliteHtml,
                          }}
                        />
                      </div>
                    ) : (
                      <div style={{ color: '#ef4444', marginBottom: 8 }}>
                        Pas de tableau de rentabilité pour cette étude.
                      </div>
                    )}
                    {rentabiliteArr.length > 0 ? (
                      <>
                        <div id={`chartKwhRoi-${i}`}>
                          <ChartKwhRoi
                            ref={chartKwhRoiRef}
                            rentabilite={rentabiliteArr}
                            prixCentrale={etude.prixCentrale}
                            prodMoyenneKwh={
                              etude.prodMoyenneKwh || etude.prodMoyenne
                            }
                          />
                        </div>
                        <div
                          id={`chartRentabiliteBar-${i}`}
                          style={{ marginTop: 120 }}
                        >
                          <ChartRentabiliteBar
                            ref={chartRentabiliteBarRef}
                            rentabilite={rentabiliteArr}
                          />
                        </div>
                        <div
                          id={`chartBreakEven-${i}`}
                          style={{ marginTop: 120 }}
                        >
                          <ChartBreakEven
                            ref={chartBreakEvenRef}
                            rentabilite={rentabiliteArr}
                            prixCentrale={etude.prixCentrale}
                            prime={etude.prime}
                          />
                        </div>
                      </>
                    ) : (
                      <div style={{ color: '#ef4444', marginBottom: 8 }}>
                        Erreur : cette étude n’a pas de données de rentabilité
                        ou le format est incorrect.
                        <br />
                        <span style={{ fontSize: 13, color: '#b91c1c' }}>
                          (Vérifiez que la propriété <b>rentabilite</b> existe
                          et est un tableau)
                        </span>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
        </div>
      </div>
      <input
        type="file"
        accept=".xlsx,.csv,.pdf"
        multiple
        onChange={handleFileUpload}
      />
      <div style={{ marginTop: 24 }}>
        <h3>Devis importés</h3>
        <ul>
          {devisFiles.map((file, idx) => (
            <li key={idx}>
              {file.name}
              {file.type === 'application/pdf' ? (
                <button
                  style={{ marginLeft: 8 }}
                  onClick={() => handlePreviewPdf(file)}
                >
                  Aperçu &amp; compléter
                </button>
              ) : (
                <button
                  style={{ marginLeft: 8 }}
                  onClick={() => handleEditDevis(file)}
                >
                  Éditer
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {parsedDevis && (
        <div style={{ marginTop: 32 }}>
          <h3>Édition du devis</h3>
          <table border="1" cellPadding={4}>
            <tbody>
              {parsedDevis.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx}>
                      <input
                        value={cell}
                        onChange={(e) =>
                          handleCellChange(rowIdx, colIdx, e.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 32 }}>
        <h3>Mail récapitulatif personnalisé</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateMail();
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <label>Email du client :</label>
            <input
              type="email"
              value={mailFields.email || ''}
              onChange={(e) =>
                setMailFields((f) => ({ ...f, email: e.target.value }))
              }
              style={{ width: 220 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Adresse mail d'envoi :</label>
            <input
              type="email"
              value={user?.email || ''}
              readOnly
              style={{ width: 220, background: '#e0e7ff', fontWeight: 600 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Mot de passe de la boîte mail :</label>
            <input
              type="password"
              value={smtpPassword}
              onChange={(e) => setSmtpPassword(e.target.value)}
              style={{ width: 220 }}
              placeholder="Mot de passe Hostinger"
            />
          </div>
          <button type="submit" disabled={!selectedClient || !pdfPreview}>
            Générer le mail récapitulatif
          </button>
          <button
            type="button"
            style={{ marginLeft: 12 }}
            onClick={() => setIncludeTableInMail((v) => !v)}
          >
            {includeTableInMail
              ? 'Retirer le tableau de rentabilité du mail'
              : 'Inclure le tableau de rentabilité dans le mail'}
          </button>
        </form>
      </div>
      {mailContent && (
        <div
          style={{
            marginTop: 24,
            background: '#f6f6f6',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <h4>Mail généré :</h4>
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 18,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}
          >
            {(() => {
              const etudeData = getEtudeData();
              const tags = [
                {
                  label: 'Puissance & Stockage',
                  value: (() => {
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    // Extraction puissance et stockage
                    let puissance = '-';
                    let stockage = '-';
                    if (etude.kit) {
                      const kitMatch = String(etude.kit).match(
                        /(\d+)KWh-(\d+)/
                      );
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
                    return (
                      puissance + (stockage !== '-' ? ' / ' + stockage : '')
                    );
                  })(),
                  color: 'linear-gradient(90deg,#0ea5e9 60%,#38bdf8 100%)',
                  icon: '🔋',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #0ea5e933',
                },
                {
                  label: 'Prime EDF versée',
                  value: (() => {
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const primeValue = Number(
                      etude.primeEDF || etude.prime || 0
                    );
                    return primeValue
                      ? primeValue.toLocaleString() + ' €'
                      : '-';
                  })(),
                  color: 'linear-gradient(90deg,#FFB5DA 60%,#FF7ED4 100%)',
                  icon: '🎁',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #f59e4233',
                },
                {
                  label: 'Production annuelle',
                  value: etudeData.production,
                  color: 'linear-gradient(90deg,#FFB5DA 60%,#FF7ED4 100%)',
                  icon: '⚡',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #FFB5DA33',
                },
                {
                  label: 'Rentable en ',
                  value: etudeData.anneeRentabilite,
                  color: 'linear-gradient(90deg,#FFB5DA 60%,#FF7ED4 100%)',
                  icon: '⏳',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #FFB5DA33',
                },
              ];
              // Jauges graphiques
              const jauges = [
                {
                  icon: '🏠',
                  percent: (() => {
                    // Synchronisation : calcul identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return productionEstimeeNum > 0
                      ? (
                          (consoCouverteNum / productionEstimeeNum) *
                          100
                        ).toFixed(1)
                      : '0.0';
                  })(),
                  label: 'utilisé pour la maison',
                  kwh: (() => {
                    // Synchronisation : conso couverte identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    return consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                  })(),
                  euros: (() => {
                    // Synchronisation : économie EDF identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return consoCouverteNum
                      ? `${(consoCouverteNum * 0.25).toFixed(2)} €`
                      : '0.00 €';
                  })(),
                  color: 'linear-gradient(90deg,#4ade80 60%,#60a5fa 100%)',
                  textColor: '#fff',
                  valueColor: '#16a34a',
                },
                {
                  icon: '💸',
                  percent: (() => {
                    // Synchronisation : calcul identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return productionEstimeeNum > 0
                      ? (
                          ((productionEstimeeNum - consoCouverteNum) /
                            productionEstimeeNum) *
                          100
                        ).toFixed(1)
                      : '0.0';
                  })(),
                  label: 'en surplus revendu',
                  kwh: (() => {
                    // Synchronisation : surplus identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return productionEstimeeNum && consoCouverteNum
                      ? (productionEstimeeNum - consoCouverteNum).toFixed(2)
                      : '0.00';
                  })(),
                  euros: (() => {
                    // Synchronisation : revente identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    const surplusNum =
                      productionEstimeeNum && consoCouverteNum
                        ? productionEstimeeNum - consoCouverteNum
                        : 0;
                    return surplusNum
                      ? `${(surplusNum * 0.1767).toFixed(2)} €`
                      : '0.00 €';
                  })(),
                  color: 'linear-gradient(90deg,#fbbf24 60%,#f87171 100%)',
                  textColor: '#fff',
                  valueColor: '#bfa100',
                },
              ];
              return [
                ...tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: tag.color,
                      color: '#fff',
                      borderRadius: 16,
                      padding: '14px 28px',
                      fontWeight: 500,
                      fontSize: 16,
                      boxShadow: tag.shadow,
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginRight: 10,
                      marginBottom: 8,
                      border: '2px solid #fff2',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = 'scale(1.04)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = 'scale(1)')
                    }
                  >
                    <span style={{ fontSize: 28, marginRight: 14 }}>
                      {tag.icon}
                    </span>
                    <span style={{ fontSize: 15, opacity: 0.85 }}>
                      {tag.label}
                    </span>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        marginLeft: 14,
                        color: tag.valueColor,
                        textShadow: '0 2px 8px #0002',
                      }}
                    >
                      {tag.value}
                    </span>
                  </span>
                )),
                ...jauges.map((jauge, idx) => (
                  <div
                    key={'jauge-' + idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: jauge.color,
                      borderRadius: 24,
                      padding: '8px 24px',
                      fontWeight: 700,
                      fontSize: 20,
                      color: jauge.textColor,
                      boxShadow: '0 2px 8px #0002',
                      marginRight: 8,
                      minWidth: 260,
                      marginTop: 2,
                    }}
                  >
                    <span style={{ fontSize: 26, marginRight: 10 }}>
                      {jauge.icon}
                    </span>
                    <span style={{ marginRight: 10 }}>
                      {Number(jauge.percent).toFixed(1)}% {jauge.label}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 400,
                        marginLeft: 16,
                        color: '#e0e7ff',
                        textAlign: 'right',
                      }}
                    >
                      {jauge.kwh} kWh
                      <br />
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        {jauge.euros} {idx === 0 ? '€ économisés' : '€ gagnés'}
                      </span>
                    </span>
                  </div>
                )),
              ];
            })()}
          </div>
          <div
            dangerouslySetInnerHTML={{
              __html: mailContent.replace(/\n/g, '<br />'),
            }}
          />
          <p>
            <strong>Joindre le PDF importé à l'envoi du mail.</strong>
          </p>
        </div>
      )}
      <div style={{ marginTop: 32 }}>
        <button
          type="button"
          style={{
            background: '#2563eb',
            color: '#fff',
            padding: '10px 24px',
            borderRadius: 8,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => setShowFullPreview((v) => !v)}
        >
          {showFullPreview
            ? 'Masquer l’aperçu complet avant envoi'
            : 'Aperçu complet avant envoi'}
        </button>
        {showFullPreview && (
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 8,
              padding: 16,
              marginTop: 18,
              marginBottom: 24,
            }}
          >
            <h4 style={{ color: '#2563eb' }}>Mail récapitulatif</h4>
            {/* Aperçu complet : injecte le HTML du mail généré, puis ajoute le tableau de rentabilité et le devis si demandé */}
            {/* Bloc d'étiquettes/tags et jauges identique au mail généré */}
            {(() => {
              const etudeData = getEtudeData();
              const tags = [
                // ...copie du code de génération des tags du mail généré...
                {
                  label: 'Puissance & Stockage',
                  value: (() => {
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    // Extraction puissance et stockage
                    let puissance = '-';
                    let stockage = '-';
                    if (etude.kit) {
                      const kitMatch = String(etude.kit).match(
                        /(\d+)KWh-(\d+)/
                      );
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
                    return (
                      puissance + (stockage !== '-' ? ' / ' + stockage : '')
                    );
                  })(),
                  color: 'linear-gradient(90deg,#0ea5e9 60%,#38bdf8 100%)',
                  icon: '🔋',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #0ea5e933',
                },
                {
                  label: 'Prime EDF versée',
                  value: (() => {
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const primeValue = Number(
                      etude.primeEDF || etude.prime || 0
                    );
                    return primeValue
                      ? primeValue.toLocaleString() + ' €'
                      : '-';
                  })(),
                  color: 'linear-gradient(90deg,#FFB5DA 60%,#FF7ED4 100%)',
                  icon: '🎁',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #f59e4233',
                },
                {
                  label: 'Production annuelle',
                  value: etudeData.production,
                  color: 'linear-gradient(90deg,#FFB5DA 60%,#FF7ED4 100%)',
                  icon: '⚡',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #FFB5DA33',
                },
                {
                  label: 'Rentable en ',
                  value: etudeData.anneeRentabilite,
                  color: 'linear-gradient(90deg,#FFB5DA 60%,#FF7ED4 100%)',
                  icon: '⏳',
                  valueColor: '#fff',
                  shadow: '0 2px 12px #FFB5DA33',
                },
              ];
              // Jauges graphiques
              const jauges = [
                {
                  icon: '🏠',
                  percent: (() => {
                    // Synchronisation : calcul identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return productionEstimeeNum > 0
                      ? (
                          (consoCouverteNum / productionEstimeeNum) *
                          100
                        ).toFixed(1)
                      : '0.0';
                  })(),
                  label: 'utilisé pour la maison',
                  kwh: (() => {
                    // Synchronisation : conso couverte identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    return consoAnnuelleNum
                      ? (consoAnnuelleNum * 0.95).toFixed(0)
                      : '0';
                  })(),
                  euros: (() => {
                    // Synchronisation : économies identiques au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const economieEDF = consoAnnuelleNum
                      ? (consoAnnuelleNum * 0.95 * 0.25).toFixed(2)
                      : '0.00';
                    return economieEDF + ' € économisés';
                  })(),
                  color: 'linear-gradient(90deg,#4ade80 60%,#38bdf8 100%)',
                  textColor: '#fff',
                  valueColor: '#16a34a',
                },
                {
                  icon: '💸',
                  percent: (() => {
                    // Synchronisation : calcul identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return productionEstimeeNum > 0
                      ? (
                          ((productionEstimeeNum - consoCouverteNum) /
                            productionEstimeeNum) *
                          100
                        ).toFixed(1)
                      : '0.0';
                  })(),
                  label: 'en surplus revendu',
                  kwh: (() => {
                    // Synchronisation : surplus identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    return productionEstimeeNum && consoCouverteNum
                      ? (productionEstimeeNum - consoCouverteNum).toFixed(2)
                      : '0.00';
                  })(),
                  euros: (() => {
                    // Synchronisation : revente identique au mail
                    const client = clients.find((c) => c.id === selectedClient);
                    let etude = null;
                    if (
                      client?.Etude &&
                      Array.isArray(client.Etude) &&
                      client.Etude.length > 0
                    ) {
                      etude = client.Etude[0];
                    } else if (client?.etudePerso) {
                      etude = client.etudePerso;
                    } else {
                      etude = {};
                    }
                    const productionEstimeeNum = Number(
                      etude.prodMoyenneKwh || 0
                    );
                    const consoAnnuelleNum = Number(
                      etude.conso || etude.consoAnnuelle || 0
                    );
                    const consoCouverteNum = consoAnnuelleNum
                      ? Number((consoAnnuelleNum * 0.95).toFixed(0))
                      : 0;
                    const surplusNum =
                      productionEstimeeNum && consoCouverteNum
                        ? productionEstimeeNum - consoCouverteNum
                        : 0;
                    return surplusNum
                      ? `${(surplusNum * 0.1767).toFixed(2)} €`
                      : '0.00 €';
                  })(),
                  color: 'linear-gradient(90deg,#fbbf24 60%,#f87171 100%)',
                  textColor: '#fff',
                  valueColor: '#bfa100',
                },
              ];
              return [
                ...tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: tag.color,
                      color: '#fff',
                      borderRadius: 16,
                      padding: '14px 28px',
                      fontWeight: 500,
                      fontSize: 16,
                      boxShadow: tag.shadow,
                      display: 'inline-flex',
                      alignItems: 'center',
                      marginRight: 10,
                      marginBottom: 8,
                      border: '2px solid #fff2',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.transform = 'scale(1.04)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.transform = 'scale(1)')
                    }
                  >
                    <span style={{ fontSize: 28, marginRight: 14 }}>
                      {tag.icon}
                    </span>
                    <span style={{ fontSize: 15, opacity: 0.85 }}>
                      {tag.label}
                    </span>
                    <span
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        marginLeft: 14,
                        color: tag.valueColor,
                        textShadow: '0 2px 8px #0002',
                      }}
                    >
                      {tag.value}
                    </span>
                  </span>
                )),
                ...jauges.map((jauge, idx) => (
                  <div
                    key={'jauge-' + idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      background: jauge.color,
                      borderRadius: 24,
                      padding: '8px 24px',
                      fontWeight: 700,
                      fontSize: 20,
                      color: jauge.textColor,
                      boxShadow: '0 2px 8px #0002',
                      marginRight: 8,
                      minWidth: 260,
                      marginTop: 2,
                    }}
                  >
                    <span style={{ fontSize: 26, marginRight: 10 }}>
                      {jauge.icon}
                    </span>
                    <span style={{ marginRight: 10 }}>
                      {Number(jauge.percent).toFixed(1)}% {jauge.label}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 400,
                        marginLeft: 16,
                        color: '#e0e7ff',
                        textAlign: 'right',
                      }}
                    >
                      {jauge.kwh} kWh
                      <br />
                      <span style={{ color: '#fff', fontWeight: 600 }}>
                        {jauge.euros} {idx === 0 ? '€ économisés' : '€ gagnés'}
                      </span>
                    </span>
                  </div>
                )),
              ];
            })()}
            <div
              dangerouslySetInnerHTML={{
                __html: mailContent.replace(/\n/g, '<br />'),
              }}
            />
            {/* Suppression de l'ancien tableau de rentabilité (renderValue) dans l'aperçu mail/preview. Seul le tableau HTML sauvegardé (tableauRentabiliteHtml) est conservé. */}
            {pdfPreview && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ color: '#2563eb' }}>Aperçu du devis importé</h4>
                <iframe
                  src={pdfPreview}
                  width="100%"
                  height="400px"
                  title="Aperçu PDF"
                  style={{ borderRadius: 8, border: '1px solid #d1d5db' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          style={{
            background: '#16a34a',
            color: '#fff',
            padding: '12px 32px',
            borderRadius: 8,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: 18,
          }}
          onClick={handleSendMail}
          disabled={!selectedClient || !mailFields.email || !mailContent}
        >
          Envoyer au client
        </button>
      </div>
    </div>
  );
};

export default FaireProposition;
