// components/Header.jsx

import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';

export default function Header() {
  const [showCalculateur, setShowCalculateur] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [relancesJourCount, setRelancesJourCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const tokenResult = await u.getIdTokenResult();
        setRole(tokenResult.claims.role || null);
      } else {
        setRole(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Écoute le localStorage pour la notif relances du jour
    function updateCount() {
      const count = Number(localStorage.getItem('relancesJourCount') || 0);
      setRelancesJourCount(count);
    }
    window.addEventListener('storage', updateCount);
    updateCount();
    return () => window.removeEventListener('storage', updateCount);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/'); // redirige vers accueil
  };

  return (
    <header
      style={{
        background: '#111827',
        color: '#fff',
        padding: '10px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Link
        to="/"
        style={{
          color: '#fff',
          fontSize: '20px',
          fontWeight: 'bold',
          textDecoration: 'none',
        }}
      >
        Botaik CRM
      </Link>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link
            to="/dashboard"
            style={{
              background: '#3b82f6',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#fff',
              fontWeight: '500',
            }}
          >
            🏠 Mon Dashboard
          </Link>
          <Link
            to="/mes-clients"
            style={{
              background: '#f59e42',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#fff',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span role="img" aria-label="clients" style={{ fontSize: 20 }}>👥</span>
            Mes clients
          </Link>

          {/* Liens admin */}
          {role === 'admin' && (
            <>
              <Link
                to="/user-management"
                style={{
                  background: '#f59e0b',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#fff',
                  fontWeight: '500',
                }}
              >
                👤 Gestion utilisateur
              </Link>
              <Link
                to="/sav"
                style={{
                  background: '#10b981',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#fff',
                  fontWeight: '500',
                }}
              >
                🛠️ SAV
              </Link>
              <Link
                to="/logistique"
                style={{
                  background: '#6366f1',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: '#fff',
                  fontWeight: '500',
                }}
              >
                🚚 Logistique
              </Link>
            </>
          )}
          {/* Lien Calculateur pour tous les rôles autorisés */}
          {['admin', 'manager', 'commercial', 'phoneur'].includes(role) && (
            <Link
              to="/calculateur"
              style={{
                background: '#f43f5e',
                padding: '8px 16px',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: '500',
                textDecoration: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              📊 Calculateur
            </Link>
          )}
          <Link
            to="/relances"
            style={{
              background: '#fbbf24',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#fff',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
            }}
          >
            <span role="img" aria-label="relances" style={{ fontSize: 20 }}>⏰</span>
            Relances
            {relancesJourCount > 0 && (
              <span style={{
                position: 'absolute',
                top: -6,
                right: -6,
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                minWidth: 22,
                height: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: '0 2px 8px #ef444488',
                zIndex: 2
              }}>{relancesJourCount}</span>
            )}
          </Link>
          <Link
            to="/faire-proposition"
            style={{
              background: '#4ade80',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              color: '#fff',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span role="img" aria-label="proposition" style={{ fontSize: 20 }}>💼</span>
            Faire une proposition
          </Link>

          <button
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            🚪 Déconnexion
          </button>

          <span
            style={{
              background: '#374151',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '14px',
              marginLeft: '10px',
            }}
          >
            {user.email} <span style={{color:'#f59e0b',marginLeft:6}}>(role: {role || 'aucun'})</span>
          </span>
        </div>
      ) : (
        <Link
          to="/profile"
          style={{
            background: '#10b981',
            padding: '8px 16px',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#fff',
            fontWeight: '500',
          }}
        >
          🔑 Connexion
        </Link>
      )}
    </header>
  );
}
