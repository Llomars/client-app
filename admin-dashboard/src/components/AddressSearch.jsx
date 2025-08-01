import React, { useState } from 'react';

export default function AddressSearch({ setLat, setLon, setLocalisation }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    // Utilise l'API Nominatim d'OpenStreetMap (pas de clé requise)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  const handleSelect = (place) => {
    setLat(Number(place.lat).toFixed(5));
    setLon(Number(place.lon).toFixed(5));
    setLocalisation(place.display_name);
    setResults([]);
    setQuery(place.display_name);
  };

  return (
    <div style={{ margin: '18px 0' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher une adresse, ville, lieu..."
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ddd' }}
        />
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 4, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 600 }} disabled={loading}>
          {loading ? '...' : 'Rechercher'}
        </button>
      </form>
      {results.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 6, marginTop: 6, maxHeight: 180, overflowY: 'auto', zIndex: 10, position: 'relative' }}>
          {results.map((place, i) => (
            <div
              key={i}
              onClick={() => handleSelect(place)}
              style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid #f1f1f1', fontSize: 15 }}
            >
              {place.display_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
