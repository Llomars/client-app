import React, { useEffect, useState } from 'react';

export default function PVGISDemo() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const pvgisUrl = "https://re.jrc.ec.europa.eu/api/v5_2/PVcalc?lat=48.85&lon=2.35&peakpower=1&loss=14&outputformat=json";
    const encodedUrl = encodeURIComponent(pvgisUrl);
    fetch(`https://pvgis-proxy-next-clean.vercel.app/api/pvgis?url=${encodedUrl}`)
      .then(res => {
        if (res.headers.get('content-type')?.includes('application/json')) {
          return res.json();
        } else {
          return res.text();
        }
      })
      .then(setData)
      .catch(setError);
  }, []);

  return (
    <div style={{padding:20}}>
      <h2>Démo PVGIS Proxy</h2>
      {error && <div style={{color:'red'}}>Erreur : {error.message}</div>}
      <pre style={{background:'#eee',padding:10,maxHeight:400,overflow:'auto'}}>
        {data ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : 'Chargement...'}
      </pre>
    </div>
  );
}
