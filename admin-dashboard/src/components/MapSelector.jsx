import React from 'react';

export default function MapSelector({ lat, lon, setLat, setLon }) {
  // Utilise l'API Google Maps Embed pour un affichage simple, ou leaflet/openstreetmap pour du libre
  // Ici, on utilise leaflet (open source, pas besoin de clé API)
  React.useEffect(() => {
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet/dist/leaflet.js';
      script.onload = () => window.dispatchEvent(new Event('leaflet-ready'));
      document.body.appendChild(script);
    }
  }, []);

  React.useEffect(() => {
    function initMap() {
      if (!window.L) return;
      if (window._map) return;
      const map = window.L.map('mapid').setView([lat || -21.13, lon || 55.53], 10);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
      }).addTo(map);
      const marker = window.L.marker([lat || -21.13, lon || 55.53], { draggable: true }).addTo(map);
      marker.on('dragend', function (e) {
        const { lat, lng } = e.target.getLatLng();
        setLat(lat.toFixed(5));
        setLon(lng.toFixed(5));
      });
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        setLat(e.latlng.lat.toFixed(5));
        setLon(e.latlng.lng.toFixed(5));
      });
      window._map = map;
      window._marker = marker;
    }
    if (window.L) {
      setTimeout(initMap, 100);
    } else {
      window.addEventListener('leaflet-ready', initMap, { once: true });
    }
    return () => {
      if (window._map) {
        window._map.remove();
        window._map = null;
        window._marker = null;
      }
    };
  }, [lat, lon, setLat, setLon]);

  return (
    <div style={{ margin: '18px 0' }}>
      <div id="mapid" style={{ height: 260, width: '100%', borderRadius: 8, border: '1px solid #ddd' }}></div>
      <div style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
        Clique sur la carte ou déplace le marqueur pour choisir la position exacte.
      </div>
    </div>
  );
}
