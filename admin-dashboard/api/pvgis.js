// Vercel Serverless Function: /api/pvgis


  const { lat, lon, puissance, angle, azimut } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Coordonnées lat/lon manquantes.' });
  }
  const url = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-ERA5&peakpower=${puissance || 3}&loss=14&angle=${angle || 30}&aspect=${azimut || 0}&outputformat=json`;
  try {
    const response = await globalThis.fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur lors de la requête vers PVGIS.' });
  }
// Fin de la fonction handler
