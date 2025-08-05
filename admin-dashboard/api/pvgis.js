// Proxy PVGIS pour Vercel (serverless function ou local)
// trigger vercel redeploy
import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    console.log('[PVGIS PROXY] Appel:', url);
    const response = await axios.get(url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(response.data);
  } catch (e) {
    // Log complet : code HTTP, data, headers, message
    if (e.response) {
      console.error('[PVGIS PROXY ERROR]', {
        url,
        status: e.response.status,
        statusText: e.response.statusText,
        data: e.response.data,
        headers: e.response.headers
      });
    } else {
      console.error('[PVGIS PROXY ERROR]', { url, message: e.message });
    }
    let errorMsg = e.message;
    if (e.response && e.response.data) {
      errorMsg = e.response.data;
    }
    res.status(500).json({ error: errorMsg, status: e.response?.status });
  }
}
