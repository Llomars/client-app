import React, { useState, useEffect } from 'react';
import { getPVGISProduction } from '../utils/pvgis';
import MapSelector from '../components/MapSelector';
import AddressSearch from '../components/AddressSearch';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const EQUIPEMENTS = [
  'Climatisation',
  'Piscine',
  'Frigo',
  'Four',
  'Lave-vaisselle',
  'Jacuzzi',
  'Sèche-linge',
  'Congélateur',
  'Chauffe-eau',
  'Voiture électrique',
];

const PROFILS = [
  'Écologie',
  'Autonomie',
  'Économie',
  'Revente de surplus',
  'Plus-value du bien',
  'Prime EDF',
];

// Icônes SVG outline premium pour le stepper
const StepIcons = [
  // Profil consommateur (utilisateur)
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="9" r="4" stroke="#2563eb" strokeWidth="2"/><path d="M4 22c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/></svg>,
  // Consommation (éclair)
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 3v8h5l-7 12v-8H6l7-12z" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round"/></svg>,
  // Équipements (engrenage)
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="3.5" stroke="#2563eb" strokeWidth="2"/><path d="M13 2v2M13 22v2M4.93 4.93l1.42 1.42M19.65 19.65l1.42 1.42M2 13h2M22 13h2M4.93 21.07l1.42-1.42M19.65 6.35l1.42-1.42" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"/></svg>,
  // Localisation (pin)
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><path d="M13 23s7-7.5 7-12A7 7 0 1 0 6 11c0 4.5 7 12 7 12z" stroke="#2563eb" strokeWidth="2"/><circle cx="13" cy="11" r="2.5" stroke="#2563eb" strokeWidth="2"/></svg>,
  // Estimation (graphe)
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><rect x="4" y="16" width="3" height="6" rx="1.5" stroke="#2563eb" strokeWidth="2"/><rect x="10" y="10" width="3" height="12" rx="1.5" stroke="#2563eb" strokeWidth="2"/><rect x="16" y="6" width="3" height="16" rx="1.5" stroke="#2563eb" strokeWidth="2"/></svg>,
];

const steps = [
  { label: 'Profil consommateur', icon: StepIcons[0] },
  { label: 'Consommation', icon: StepIcons[1] },
  { label: 'Équipements', icon: StepIcons[2] },
  { label: 'Localisation', icon: StepIcons[3] },
  { label: 'Estimation', icon: StepIcons[4] },
];

// Exemple de clients (à remplacer par vos données réelles)
const CLIENTS = [
  { id: '1', nom: 'Jean Dupont', email: 'jean.dupont@email.com' },
  { id: '2', nom: 'Marie Martin', email: 'marie.martin@email.com' },
  { id: '3', nom: 'Ali Ben', email: 'ali.ben@email.com' },
];

// Ajout du mapping pour les orientations cardinales
const ORIENTATIONS = [
  { label: 'Sud', value: 0 },
  { label: 'Sud-Est', value: -45 },
  { label: 'Est', value: -90 },
  { label: 'Nord-Est', value: -135 },
  { label: 'Nord', value: 180 },
  { label: 'Nord-Ouest', value: 135 },
  { label: 'Ouest', value: 90 },
  { label: 'Sud-Ouest', value: 45 },
];

export default function EtudePerso() {
  const [step, setStep] = useState(0);
  const [conso, setConso] = useState('');
  const [equipements, setEquipements] = useState([]);
  const [profils, setProfils] = useState([]);
  const [localisation, setLocalisation] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [puissance, setPuissance] = useState(3);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profilError, setProfilError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [assignMessage, setAssignMessage] = useState('');
  const [clients, setClients] = useState([]);
  // Ajout des états pour inclinaison et orientation
  const [inclinaison, setInclinaison] = useState(30); // valeur par défaut 30°
  const [orientation, setOrientation] = useState(0); // 0 = plein sud

  const handleEquipChange = (e) => {
    const value = e.target.value;
    setEquipements((prev) =>
      prev.includes(value)
        ? prev.filter((eq) => eq !== value)
        : [...prev, value]
    );
  };

  const handleProfilChange = (e) => {
    const value = e.target.value;
    if (profils.includes(value)) {
      setProfils(profils.filter((p) => p !== value));
      setProfilError('');
    } else if (profils.length < 3) {
      setProfils([...profils, value]);
      setProfilError('');
    } else {
      setProfilError('Vous pouvez sélectionner jusqu’à 3 profils maximum.');
    }
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!lat || !lon) {
      setError('Merci de renseigner la latitude et la longitude.');
      return;
    }
    setLoading(true);
    try {
      const prod = await getPVGISProduction(lat, lon, puissance, inclinaison, orientation);
      setResult({
        prod,
        equipements,
        profils,
        localisation,
        lat,
        lon,
        puissance,
        conso, // Ajout explicite de la consommation annuelle
        inclinaison,
        orientation,
      });
    } catch (err) {
      setError('Erreur lors de la récupération des données PVGIS.');
    }
    setLoading(false);
  };

  // Fonction d'assignation (à relier à votre backend/Firestore)
  const assignToClient = async () => {
    if (!selectedClient) return;
    try {
      await updateDoc(doc(db, 'clients', selectedClient.id), {
        etudePerso: result,
        etudePersoDate: new Date(),
      });
      setAssignMessage(`Étude assignée à ${selectedClient.nom}`);
    } catch (e) {
      setAssignMessage("Erreur lors de l'assignation : " + e.message);
    }
    setShowModal(false);
    setSelectedClient(null);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'clients'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setClients(data);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ maxWidth: 540, margin: '48px auto', background: '#f9fafb', borderRadius: 20, padding: 36, boxShadow: '0 6px 32px #2563eb18', position: 'relative', border: '1.5px solid #e5e7eb' }}>
      <h2 style={{ marginBottom: 28, textAlign: 'center', fontWeight: 800, letterSpacing: 0.5, color: '#1e293b', fontSize: 26, lineHeight: 1.2 }}>🔎 Étude personnalisée solaire</h2>
      {/* Stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36, gap: 16 }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: i <= step ? 1 : 0.35 }}>
            <div style={{
              background: i === step ? 'linear-gradient(135deg,#2563eb22 60%,#fff 100%)' : '#f1f5f9',
              border: i === step ? '2.5px solid #2563eb' : '1.5px solid #e5e7eb',
              borderRadius: '50%',
              width: 54,
              height: 54,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
              boxShadow: i === step ? '0 4px 16px #2563eb22' : 'none',
              transition: 'all .2s',
            }}>{s.icon}</div>
            <span style={{ fontSize: 14, fontWeight: i === step ? 700 : 400, color: i === step ? '#2563eb' : '#64748b', letterSpacing: 0.2 }}>{s.label}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Step 0: Profil consommateur */}
        {step === 0 && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 18, boxShadow: '0 2px 8px #2563eb11' }}>
            <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 16 }}>👤 Profil consommateur :</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {PROFILS.map(profil => (
                <label key={profil} style={{ display: 'flex', alignItems: 'center', gap: 8, background: profils.includes(profil) ? '#2563eb11' : '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', border: profils.includes(profil) ? '2px solid #2563eb' : '1.5px solid #e5e7eb', fontWeight: 600, fontSize: 15, transition: 'all .15s' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, border: profils.includes(profil) ? '2px solid #2563eb' : '1.5px solid #cbd5e1', background: profils.includes(profil) ? '#2563eb' : '#fff', marginRight: 8, transition: 'all .15s' }}>
                    {profils.includes(profil) && (
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ display: 'block' }}>
                        <rect width="20" height="20" rx="4" fill="#2563eb"/>
                        <path d="M6 10.5L9 13.5L14 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    value={profil}
                    checked={profils.includes(profil)}
                    onChange={handleProfilChange}
                    style={{ display: 'none' }}
                  />
                  {profil}
                </label>
              ))}
            </div>
            {profilError && <div style={{ color: '#ef4444', marginTop: 10 }}>{profilError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" onClick={handleNext} disabled={profils.length === 0} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: profils.length === 0 ? 'not-allowed' : 'pointer', boxShadow: '0 2px 8px #2563eb11' }}>Suivant</button>
            </div>
          </div>
        )}
        {/* Step 1: Consommation */}
        {step === 1 && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 18, boxShadow: '0 2px 8px #2563eb11' }}>
            <label style={{ fontWeight: 500, fontSize: 16 }}>
              ⚡ Consommation annuelle (kWh ou €) :
              <input
                type="number"
                value={conso}
                onChange={e => setConso(e.target.value)}
                placeholder="Ex : 5000"
                style={{ marginLeft: 12, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 180 }}
                required
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button type="button" onClick={handleBack} style={{ background: '#e0e7ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15 }}>Retour</button>
              <button type="button" onClick={handleNext} disabled={!conso} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15, cursor: !conso ? 'not-allowed' : 'pointer' }}>Suivant</button>
            </div>
          </div>
        )}
        {/* Step 2: Équipements */}
        {step === 2 && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 18, boxShadow: '0 2px 8px #2563eb11' }}>
            <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 16 }}>🛠️ Équipements présents :</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {EQUIPEMENTS.map(eq => (
                <label key={eq} style={{ display: 'flex', alignItems: 'center', gap: 8, background: equipements.includes(eq) ? '#2563eb11' : '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', border: equipements.includes(eq) ? '2px solid #2563eb' : '1.5px solid #e5e7eb', fontWeight: 600, fontSize: 15, transition: 'all .15s' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, border: equipements.includes(eq) ? '2px solid #2563eb' : '1.5px solid #cbd5e1', background: equipements.includes(eq) ? '#2563eb' : '#fff', marginRight: 8, transition: 'all .15s' }}>
                    {equipements.includes(eq) && (
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ display: 'block' }}>
                        <rect width="20" height="20" rx="4" fill="#2563eb"/>
                        <path d="M6 10.5L9 13.5L14 8.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    value={eq}
                    checked={equipements.includes(eq)}
                    onChange={handleEquipChange}
                    style={{ display: 'none' }}
                  />
                  {eq}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button type="button" onClick={handleBack} style={{ background: '#e0e7ff', color: '#2563eb', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 16 }}>Retour</button>
              <button type="button" onClick={handleNext} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 16, boxShadow: '0 2px 8px #2563eb11' }}>Suivant</button>
            </div>
          </div>
        )}
        {/* Step 3: Localisation */}
        {step === 3 && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 18, boxShadow: '0 2px 8px #2563eb11' }}>
            <label style={{ fontWeight: 500, fontSize: 16 }}>
              📍 Localisation (adresse ou ville) :
              <input
                type="text"
                value={localisation}
                onChange={e => setLocalisation(e.target.value)}
                placeholder="Ex : Saint-Denis, La Réunion"
                style={{ marginLeft: 12, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 220 }}
              />
            </label>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <label>
                Latitude :
                <input
                  type="number"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="-20.8789"
                  step="any"
                  style={{ marginLeft: 8, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 110 }}
                  required
                />
              </label>
              <label>
                Longitude :
                <input
                  type="number"
                  value={lon}
                  onChange={e => setLon(e.target.value)}
                  placeholder="55.4481"
                  step="any"
                  style={{ marginLeft: 8, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 110 }}
                  required
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <label>
                Inclinaison (°) :
                <input
                  type="number"
                  value={inclinaison}
                  onChange={e => setInclinaison(Number(e.target.value))}
                  min={0}
                  max={90}
                  step={1}
                  style={{ marginLeft: 8, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 90 }}
                  required
                />
              </label>
              <label>
                Orientation :
                <select
                  value={orientation}
                  onChange={e => setOrientation(Number(e.target.value))}
                  style={{ marginLeft: 8, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 130 }}
                >
                  {ORIENTATIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label} ({opt.value}°)</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <AddressSearch setLat={setLat} setLon={setLon} setLocalisation={setLocalisation} />
            </div>
            <div style={{ marginTop: 12 }}>
              <MapSelector lat={lat} lon={lon} setLat={setLat} setLon={setLon} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button type="button" onClick={handleBack} style={{ background: '#e0e7ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15 }}>Retour</button>
              <button type="button" onClick={handleNext} disabled={!lat || !lon} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15, cursor: !lat || !lon ? 'not-allowed' : 'pointer' }}>Suivant</button>
            </div>
          </div>
        )}
        {/* Step 4: Estimation */}
        {step === 4 && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, padding: 18, boxShadow: '0 2px 8px #2563eb11' }}>
            <label style={{ fontWeight: 500, fontSize: 16 }}>
              ☀️ Puissance centrale (kWc) :
              <input
                type="number"
                value={puissance}
                onChange={e => setPuissance(e.target.value)}
                min={1}
                max={36}
                step={0.1}
                style={{ marginLeft: 12, padding: 8, borderRadius: 4, border: '1px solid #ddd', width: 110 }}
                required
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button type="button" onClick={handleBack} style={{ background: '#e0e7ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15 }}>Retour</button>
              <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15 }} disabled={loading}>
                {loading ? <span style={{ display: 'inline-block', verticalAlign: 'middle' }}><span className="loader" style={{ width: 18, height: 18, border: '3px solid #fff', borderTop: '3px solid #2563eb', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: 8 }}></span>Calcul...</span> : 'Calculer la production solaire'}
              </button>
            </div>
          </div>
        )}
      </form>
      {error && <div style={{ color: '#ef4444', marginTop: 18, textAlign: 'center', fontWeight: 600 }}>{error}</div>}
      {result && (
        <div style={{
          marginTop: 36,
          background: '#fff',
          borderRadius: 18,
          padding: 32,
          boxShadow: '0 4px 24px #2563eb18',
          textAlign: 'left',
          maxWidth: 500,
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
          border: '1.5px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 36, color: '#22c55e', background: '#e0ffe0', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>☀️</div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 22, color: '#1e293b' }}>Étude personnalisée PVGIS</h3>
              <div style={{ color: '#2563eb', fontWeight: 500, fontSize: 15 }}>Résumé de l'estimation solaire</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18 }}>
            <div style={{ flex: '1 1 180px', background: '#f1f5f9', borderRadius: 10, padding: 14, minWidth: 160, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 15, color: '#64748b', marginBottom: 2 }}>Production annuelle</div>
              <div style={{ fontWeight: 700, fontSize: 20, color: '#2563eb' }}>{result.prod} kWh</div>
            </div>
            <div style={{ flex: '1 1 120px', background: '#f1f5f9', borderRadius: 10, padding: 14, minWidth: 120, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 15, color: '#64748b', marginBottom: 2 }}>Puissance installée</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{result.puissance} kWc</div>
            </div>
            <div style={{ flex: '1 1 120px', background: '#f1f5f9', borderRadius: 10, padding: 14, minWidth: 120, border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 15, color: '#64748b', marginBottom: 2 }}>Consommation annuelle</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{conso ? conso + ' kWh' : '—'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 18 }}>
            <div style={{ flex: '1 1 120px', background: '#e0ffe0', borderRadius: 10, padding: 14, minWidth: 120, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 15, color: '#22c55e', marginBottom: 2 }}>Autonomie estimée</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>
                {conso && result.prod ? Math.min(100, Math.round((result.prod / conso) * 100)) : '—'} %
              </div>
            </div>
            <div style={{ flex: '1 1 120px', background: '#fef9c3', borderRadius: 10, padding: 14, minWidth: 120, border: '1px solid #fde68a' }}>
              <div style={{ fontSize: 15, color: '#eab308', marginBottom: 2 }}>Surplus estimé</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>
                {conso && result.prod ? Math.max(0, Math.round(result.prod - conso)) + ' kWh' : '—'}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 10, fontSize: 15 }}>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>Profil consommateur :</span> {result.profils && result.profils.join(', ') || 'Non renseigné'}
          </div>
          <div style={{ marginBottom: 10, fontSize: 15 }}>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>Équipements :</span> {result.equipements.join(', ') || 'Aucun'}
          </div>
          <div style={{ marginBottom: 10, fontSize: 15 }}>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>Localisation :</span> {result.localisation} <span style={{ color: '#64748b', fontWeight: 400 }}>(lat: {result.lat}, lon: {result.lon})</span>
          </div>
          <div style={{ marginBottom: 10, fontSize: 15 }}>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>Inclinaison :</span> {result.inclinaison}°
          </div>
          <div style={{ marginBottom: 10, fontSize: 15 }}>
            <span style={{ fontWeight: 600, color: '#2563eb' }}>Orientation (azimut) :</span> {result.orientation}° <span style={{ color: '#64748b', fontWeight: 400 }}>(0 = Sud, -90 = Est, 90 = Ouest)</span>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: '#94a3b8' }}>
            Source : <a href="https://re.jrc.ec.europa.eu/pvg_tools/en/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>PVGIS</a> (données officielles Europe/Afrique)
          </div>
          <button
            type="button"
            style={{
              marginTop: 32,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '14px 0',
              fontWeight: 700,
              fontSize: 17,
              width: '100%',
              boxShadow: '0 2px 8px #2563eb22',
              cursor: 'pointer',
              transition: 'background .2s',
              letterSpacing: 0.5,
            }}
            onClick={() => { setShowModal(true); setAssignMessage(''); }}
          >
            Assigner cette étude à un client
          </button>
          {assignMessage && <div style={{ color: '#22c55e', marginTop: 18, fontWeight: 700, textAlign: 'center', fontSize: 16 }}>{assignMessage}</div>}
        </div>
      )}
      {/* Modal de sélection client */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, minWidth: 320, boxShadow: '0 4px 24px #2563eb22', position: 'relative' }}>
            <h3 style={{ marginTop: 0, marginBottom: 18, textAlign: 'center' }}>Sélectionner un client</h3>
            <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 18 }}>
              {clients.length === 0 && <div style={{ color: '#888' }}>Aucun client trouvé.</div>}
              {clients.map(client => (
                <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, background: selectedClient && selectedClient.id === client.id ? '#2563eb11' : '#f1f5f9', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', border: selectedClient && selectedClient.id === client.id ? '2px solid #2563eb' : '1px solid #e5e7eb' }} onClick={() => setSelectedClient(client)}>
                  <div style={{ fontWeight: 600 }}>{client.nom} {client.prenom}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>{client.email}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button onClick={() => setShowModal(false)} style={{ background: '#e0e7ff', color: '#2563eb', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15 }}>Annuler</button>
              <button onClick={assignToClient} disabled={!selectedClient} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 24px', fontWeight: 600, fontSize: 15, cursor: !selectedClient ? 'not-allowed' : 'pointer' }}>Assigner</button>
            </div>
          </div>
        </div>
      )}
      {/* Loader animation CSS */}
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: none;} }
      `}</style>
    </div>
  );
}
