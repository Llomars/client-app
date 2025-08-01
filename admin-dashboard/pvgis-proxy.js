// Mini serveur Node.js/Express pour relayer les requêtes PVGIS
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

// Route proxy : /pvgis?url=...
app.get('/pvgis', async (req, res) => {
  const { url } = req.query;
  // Accepte toutes les variantes d'URL PVGIS (v5_2, PVcalc, seriescalc)
  const validPVGIS = [
    'https://re.jrc.ec.europa.eu/api/seriescalc',
    'https://re.jrc.ec.europa.eu/api/PVcalc',
    'https://re.jrc.ec.europa.eu/api/v5_2/PVcalc',
    'https://re.jrc.ec.europa.eu/api/v5_2/seriescalc',
    'https://re.jrc.ec.europa.eu/api/v5_2/',
    'https://re.jrc.ec.europa.eu/api/'
  ];
  if (!url || !validPVGIS.some(prefix => url.startsWith(prefix))) {
    return res.status(400).json({ error: 'URL PVGIS invalide.' });
  }
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    // Relaye le corps de la réponse d’erreur PVGIS
    if (err.response && err.response.data) {
      res.status(err.response.status).json({
        error: 'PVGIS error',
        status: err.response.status,
        message: err.response.data.message || err.response.data.error || err.message,
        data: err.response.data
      });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PVGIS proxy running on port ${PORT}`);
});
