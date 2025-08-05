// Proxy PVGIS pour Vercel (serverless function ou local)
// trigger vercel redeploy

import axios from 'axios';

  const { lat, lon, puissance = 3, angle = 30, azimut = 0 } = req.query;
  if (!lat || !lon) {
    res.status(400).json({ error: 'Missing lat/lon parameter' });
    return;
  }
  const url = `https://re.jrc.ec.europa.eu/api/PVcalc?lat=${lat}&lon=${lon}&raddatabase=PVGIS-ERA5&peakpower=${puissance}&loss=14&angle=${angle}&aspect=${azimut}&outputformat=json`;
  try {
    const response = await axios.get(url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(response.data);
  } catch (e) {
    let errorMsg = e.message;
    if (e.response && e.response.data) {
      errorMsg = e.response.data;
    }
    res.status(500).json({ error: errorMsg, status: e.response?.status });
  }
}
