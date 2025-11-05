import React, { useState } from 'react';
import axios from 'axios';
import MapSelector from '../components/MapSelector.jsx';

export default function CalculateurPlugAndPlay() {
  // Pour MapSelector
  const [lat, setLat] = useState(48.8588443);
  const [lon, setLon] = useState(2.2943506);
  const [puissance, setPuissance] = useState('');
  const [prix, setPrix] = useState('');
  // const [autoconsommation, setAutoconsommation] = useState('');
  const [consoAnnuelle, setConsoAnnuelle] = useState(''); // kWh/an
  const [orientation, setOrientation] = useState('Sud');
  const [inclinaison, setInclinaison] = useState(20);
  const [country, setCountry] = useState('France');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState({ lat: 48.8588443, lng: 2.2943506 }); // Paris par défaut
  const [loadingPVGIS, setLoadingPVGIS] = useState(false);
  const [prodEstimee, setProdEstimee] = useState('');
  const [resultat, setResultat] = useState(null);
  const [autoConsoKwh, setAutoConsoKwh] = useState(null);
  const [autoConsoPct, setAutoConsoPct] = useState(null);
  const [residuelKwh, setResiduelKwh] = useState(null);
  const [ecoResiduel, setEcoResiduel] = useState(null);
  const [adresseError, setAdresseError] = useState('');

  // Conversion orientation -> azimut PVGIS
  const orientationAzimut = {
    'Sud': 0,
    'Sud-Est': -45,
    'Est': -90,
    'Nord-Est': -135,
    'Nord': 180,
    'Nord-Ouest': 135,
    'Ouest': 90,
    'Sud-Ouest': 45,
  };

  // Géocodage ville/pays -> coordonnées
  const handleGeocode = async () => {
    setAdresseError('');
    if (!city || !country) return;
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&format=json&limit=1`);
      if (res.data && res.data.length > 0) {
        const { lat: newLat, lon: newLon } = res.data[0];
        setCoords({ lat: parseFloat(newLat), lng: parseFloat(newLon) });
        setLat(parseFloat(newLat));
        setLon(parseFloat(newLon));
      } else {
        setAdresseError('Adresse non trouvée.');
      }
    } catch (e) {
      setAdresseError('Erreur lors de la recherche d\'adresse.');
    }
  };

  // Géolocalisation navigateur
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setAdresseError('La géolocalisation n\'est pas supportée.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAdresseError('');
      },
      () => setAdresseError('Impossible de récupérer la position actuelle.')
    );
  };

  // Appel PVGIS pour estimer la production
  const handlePVGIS = async (e) => {
    e.preventDefault();
    setLoadingPVGIS(true);
    setAdresseError('');
    setProdEstimee('');
    setAutoConsoKwh(null);
    if (!puissance || !lat || !lon) {
      setAdresseError('Veuillez remplir la puissance et la localisation.');
      setLoadingPVGIS(false);
      return;
    }
    // Si la position n'a pas été changée, la ville doit être renseignée
    if (lat === 48.8588443 && lon === 2.2943506 && !city) {
      setAdresseError('Veuillez renseigner la ville ou utiliser la géolocalisation.');
      setLoadingPVGIS(false);
      return;
    }
    const azimut = orientationAzimut[orientation] ?? 180;
    const angle = inclinaison;
    const kw = Number(puissance);
    const totalLoss = 14; // pertes fixes pour plug and play (PV+onduleur+câbles)
    let urlPVGIS = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-SARAH3&peakpower=${kw}&loss=${totalLoss}&angle=${angle}&aspect=${azimut}&outputformat=json`;
    let proxyUrl = `https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodeURIComponent(urlPVGIS)}`;
    try {
      const res = await axios.get(proxyUrl);
      let totals = res.data?.outputs?.totals;
      let kwh = totals?.fixed?.E_y || totals?.E_y || 0;
      setProdEstimee(kwh);
      let autoConso = null;
      if (consoAnnuelle && Number(consoAnnuelle) > 0) {
        const conso = Number(consoAnnuelle);
        autoConso = Math.min(conso, kwh);
        setAutoConsoKwh(autoConso);
  // Pourcentage d'autoconsommation (par rapport à la conso du client)
  const pct = conso > 0 ? (autoConso / conso) * 100 : 0;
  setAutoConsoPct(pct);
        // Potentiel résiduel (exporté à EDF)
        const residuel = kwh - autoConso;
        setResiduelKwh(residuel);
        // Économie sur autoconsommation (0.25€/kWh) + vente résiduelle (0.13€/kWh)
        setEcoResiduel(residuel * 0.13);
        // Part de la conso non couverte par le kit (à payer à EDF)
        const resteAchat = conso - autoConso;
        const coutResteAchat = resteAchat > 0 ? resteAchat * 0.25 : 0;
        setResultat({
          prod: kwh,
          economie: autoConso * 0.25,
          economieResiduel: residuel * 0.13,
          investissement: Number(prix),
          resteAchat,
          coutResteAchat,
        });
      } else {
        setAutoConsoKwh(null);
        setAutoConsoPct(null);
        setResiduelKwh(null);
        setEcoResiduel(null);
        setResultat({
          prod: kwh,
          economie: 0,
          economieResiduel: 0,
          investissement: Number(prix),
        });
      }
    } catch (err) {
      setAdresseError('Erreur lors de la requête PVGIS.');
    }
    setLoadingPVGIS(false);
  };

  return (
  <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h2>Calculateur Plug and Play</h2>
      <form onSubmit={handlePVGIS} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="button" onClick={handleGeolocate} style={{ background: '#10b981', color: '#fff', padding: '8px 14px', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            📍 Utiliser ma localisation actuelle
          </button>
          <span style={{ color: '#64748b', fontSize: 13 }}>ou saisir une ville/pays ci-dessous</span>
        </div>
        <label>
          Puissance du kit (kWc)
          <input type="number" step="0.01" value={puissance} onChange={e => setPuissance(e.target.value)} required />
        </label>
        <label>
          Prix du kit (€)
          <input type="number" step="1" value={prix} onChange={e => setPrix(e.target.value)} required />
        </label>
        <label>
          Consommation annuelle du client (kWh)
          <input type="number" step="1" min="0" value={consoAnnuelle} onChange={e => setConsoAnnuelle(e.target.value)} placeholder="ex: 3500" />
        </label>
        <label>
          Orientation
          <select value={orientation} onChange={e => setOrientation(e.target.value)}>
            <option>Sud</option>
            <option>Sud-Est</option>
            <option>Est</option>
            <option>Nord-Est</option>
            <option>Nord</option>
            <option>Nord-Ouest</option>
            <option>Ouest</option>
            <option>Sud-Ouest</option>
          </select>
        </label>
        <label>
          Inclinaison (°)
          <input type="number" step="1" min="0" max="90" value={inclinaison} onChange={e => setInclinaison(e.target.value)} required />
        </label>
        <label>
          Pays
          <input type="text" value={country} onChange={e => setCountry(e.target.value)} required />
        </label>
        <label>
          Ville
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            onBlur={handleGeocode}
            required={lat === 48.8588443 && lon === 2.2943506}
            placeholder="Obligatoire si pas de géolocalisation"
          />
        </label>
        {adresseError && <div style={{ color: 'red' }}>{adresseError}</div>}
        <div style={{ margin: '18px 0' }}>
          <MapSelector lat={lat} lon={lon} setLat={setLat} setLon={setLon} />
        </div>
        <button type="submit" style={{ background: '#6366f1', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }} disabled={loadingPVGIS}>
          {loadingPVGIS ? 'Calcul en cours...' : 'Estimer la production'}
        </button>
      </form>
      {resultat && (
        <div style={{ marginTop: 32, background: '#f1f5f9', borderRadius: 8, padding: 24 }}>
          <h3>Résultats</h3>
          <div>Production estimée : <b>{resultat.prod} kWh/an</b></div>
          {autoConsoKwh !== null && (
            <>
              <div>Autoconsommation estimée : <b>{autoConsoKwh} kWh/an</b> ({autoConsoPct?.toFixed(1)}%)</div>
              <div>Économie annuelle (autoconso) : <b>{resultat.economie.toFixed(2)} €</b></div>
              <div>Revenus vente EDF (0,13€/kWh) : <b>{ecoResiduel?.toFixed(2)} €</b></div>
              <div>Part de la conso non couverte (achetée à EDF) : <b>{resultat.resteAchat} kWh/an</b></div>
              <div>Coût annuel résiduel à EDF (0,25€/kWh) : <b>{resultat.coutResteAchat?.toFixed(2)} €</b></div>
            </>
          )}
          <div>Investissement initial : <b>{resultat.investissement} €</b></div>
        </div>
      )}
    </div>
  );
}
