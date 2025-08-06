// utils/pvgis.js
// Appel via le proxy local pour contourner le CORS PVGIS

export async function getPVGISProduction(lat, lon, puissance = 3, inclinaison = 30, orientation = 0) {
  const url = `/api/pvgis?lat=${lat}&lon=${lon}&puissance=${puissance}&angle=${inclinaison}&azimut=${orientation}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur PVGIS');
  const data = await res.json();
  // Log temporaire pour debug
  console.log('Réponse PVGIS:', data);
  // Production annuelle estimée (kWh)
  const yearly = data?.outputs?.totals?.fixed?.E_y;
  return yearly ? Math.round(yearly) : null;
}
