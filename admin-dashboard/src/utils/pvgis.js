// utils/pvgis.js
// Appel via le proxy local pour contourner le CORS PVGIS

export async function getPVGISProduction(lat, lon, puissance = 3, inclinaison = 30, orientation = 0) {
  // Log pour savoir si on est côté client ou serveur
  console.log('PVGIS fetch is running on', typeof window !== 'undefined' ? 'client' : 'server');
  // Appel direct à l'API PVGIS (sans proxy)
  const url = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-ERA5&peakpower=${puissance}&loss=14&angle=${inclinaison}&aspect=${orientation}&outputformat=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur PVGIS');
  const data = await res.json();
  // Log temporaire pour debug
  console.log('Réponse PVGIS:', data);
  // Production annuelle estimée (kWh)
  const yearly = data?.outputs?.totals?.fixed?.E_y;
  return yearly ? Math.round(yearly) : null;
}
