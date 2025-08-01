// Simple proxy PVGIS pour contourner le CORS
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/pvgis', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url param' });
  try {
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Proxy PVGIS lancé sur http://localhost:${PORT}`);
});
