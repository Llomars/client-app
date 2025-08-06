// pages/Profile.jsx

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setError('');
      navigate('/dashboard');
    } catch (err) {
      setError('Email ou mot de passe incorrect');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setEmail('');
    setPassword('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f3f4f6',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, sans-serif',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '420px',
        }}
      >
        {user ? (
          <>
            <h2 style={{ marginBottom: '20px', color: '#111827' }}>
              👋 Bonjour {user.email}
            </h2>
            <button
              onClick={() => navigate('/dashboard')}
              style={btnStyle('#3b82f6')}
            >
              📊 Mon Dashboard
            </button>
            <button onClick={handleLogout} style={btnStyle('#ef4444')}>
              🚪 Déconnexion
            </button>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: '20px', color: '#111827' }}>
              🔐 Connexion Commercial
            </h2>
            {error && (
              <p style={{ color: '#dc2626', marginBottom: '12px' }}>{error}</p>
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleLogin} style={btnStyle('#10b981')}>
              ✅ Connexion
            </button>
            <p
              style={{ marginTop: '16px', fontSize: '14px', color: '#4b5563' }}
            >
              Pas de compte ?{' '}
              <button
                onClick={() => navigate('/register')}
                style={{
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '14px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Créer un compte
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginBottom: '12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '16px',
};

const btnStyle = (bg) => ({
  width: '100%',
  padding: '12px',
  marginBottom: '12px',
  border: 'none',
  borderRadius: '8px',
  background: bg,
  color: 'white',
  fontSize: '16px',
  cursor: 'pointer',
});
