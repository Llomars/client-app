// Vercel Serverless Function: /api/pvgis
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { lat, lon, puissance, angle, azimut } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat/lon' });
  }
  const url = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-ERA5&peakpower=${puissance || 3}&loss=14&angle=${angle || 30}&aspect=${azimut || 0}&outputformat=json`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la requête PVGIS (v5_2).' });
  }
}
