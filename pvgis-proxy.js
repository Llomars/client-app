const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/pvgis', async (req, res) => {
  const { url } = req.query;
  console.log('Requête proxy PVGIS:', url); // Log l'URL reçue
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  try {
    const response = await axios.get(url);
    console.log('Réponse PVGIS status:', response.status);
    // Affiche un extrait de la réponse pour debug
    console.log('Réponse PVGIS data:', JSON.stringify(response.data).slice(0, 500));
    res.json(response.data);
  } catch (err) {
    console.error('Erreur lors de la requête PVGIS:', err.message);
    if (err.response) {
      console.error('Réponse erreur PVGIS:', err.response.status, JSON.stringify(err.response.data).slice(0, 500));
    }
    res.status(err.response?.status || 500).json({ error: err.message, data: err.response?.data });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`PVGIS proxy running on http://localhost:${PORT}`);
});
