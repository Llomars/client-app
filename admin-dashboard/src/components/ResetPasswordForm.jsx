import React, { useState } from 'react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const auth = getAuth();
      await sendPasswordResetEmail(auth, email);
      setMessage('Un email de réinitialisation a été envoyé. Vérifiez votre boîte mail.');
    } catch (err) {
      setMessage('Erreur : ' + (err.message || "Impossible d'envoyer le mail."));
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', background: '#fff', padding: 30, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.07)' }}>
      <h2 style={{ marginBottom: 18 }}>🔒 Mot de passe oublié</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ width: '100%', padding: 12, marginBottom: 16, borderRadius: 8, border: '1px solid #ddd' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 500 }}
        >
          {loading ? 'Envoi...' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
      {message && <div style={{ marginTop: 18, color: '#334155', fontSize: 15 }}>{message}</div>}
    </div>
  );
}

export default ResetPasswordForm;
