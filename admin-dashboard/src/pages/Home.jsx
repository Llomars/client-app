import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
      <img src="/logopur.png" alt="Logo Botaik" style={{ width: 660, marginBottom: 32 }} />
      <h1 style={{ color: '#6366f1', fontWeight: 900, fontSize: 38, marginBottom: 18 }}>Bienvenue sur Botaik CRM</h1>
      <Link
        to="/profile"
        style={{
          background: '#10b981',
          color: '#fff',
          borderRadius: 8,
          padding: '14px 38px',
          fontWeight: 700,
          fontSize: 22,
          textDecoration: 'none',
          marginTop: 18,
        }}
      >
        🔑 Connexion
      </Link>
    </div>
  );
}
