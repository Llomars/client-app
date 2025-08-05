// Proxy PVGIS pour Vercel (serverless function ou local)
import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }
  try {
    const response = await axios.get(url);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
