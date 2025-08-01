// Proxy Node.js pour contourner le CORS PVGIS
// Ne pas utiliser en production sans auth/rate limit !

const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/api/pvgis', async (req, res) => {
  const { lat, lon, puissance = 3, angle = 30, azimut = 0 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: 'lat/lon requis' });
  // angle = slope (inclinaison), azimut = orientation
  const url = `https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=${lat}&lon=${lon}&peakpower=${puissance}&loss=14&angle=${angle}&aspect=${azimut}&outputformat=json`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      const errorData = await r.json().catch(() => ({}));
      return res.status(r.status).json({
        error: 'PVGIS error',
        status: r.status,
        message: errorData.message || errorData.error || 'Erreur PVGIS',
        data: errorData
      });
    }
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur proxy PVGIS', details: e.message });
  }
});

const PORT = process.env.PORT || 4001;
if (require.main === module) {
  app.listen(PORT, () => console.log('PVGIS proxy running on port', PORT));
}

module.exports = app;
