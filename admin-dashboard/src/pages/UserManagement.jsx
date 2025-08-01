import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';

export default function UserManagement() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('commercial');
  const [managerEmail, setManagerEmail] = useState('');
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);

  // Synchronisation Firestore à chaque création ou update
  const handleCreateOrUpdateUser = async () => {
    try {
      let uid = null;
      let userEmail = email;
      if (!email || !role) {
        setError('Email et rôle obligatoires');
        return;
      }
      // Vérifie si l'utilisateur existe déjà dans /users
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const existing = snapshot.docs.find((u) => u.data().email === email);
      if (existing) {
        uid = existing.id;
      } else {
        // Crée aussi dans Auth si besoin
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        uid = userCredential.user.uid;
        userEmail = userCredential.user.email;
      }
      // Ajoute ou met à jour le doc Firestore
      await setDoc(doc(db, 'users', uid), {
        email: userEmail,
        role,
        managerEmail: role === 'commercial' ? managerEmail : null,
      }, { merge: true });
      setError(null);
      alert('Utilisateur synchronisé dans Firestore !');
    } catch (error) {
      setError(error.message);
    }
  };

  // Affiche la liste des utilisateurs Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        setError(error.message);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Gestion des utilisateurs</h1>
      <div style={{ marginBottom: '20px' }}>
        <label>Email :</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginLeft: '10px' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label>Mot de passe :</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginLeft: '10px' }}
        />
      </div>
      <div style={{ marginBottom: '20px' }}>
        <label>Rôle :</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ marginLeft: '10px' }}
        >
          <option value="commercial">Commercial</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
          <option value="phoneur">Phoneur</option>
        </select>
      </div>
      {role === 'commercial' && (
        <div style={{ marginBottom: '20px' }}>
          <label>Email du manager :</label>
          <input
            type="email"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
            style={{ marginLeft: '10px' }}
          />
        </div>
      )}
      <button
        onClick={handleCreateOrUpdateUser}
        style={{
          background: '#3b82f6',
          color: '#fff',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Créer ou mettre à jour utilisateur
      </button>
      {error && (
        <div style={{ color: 'red', marginTop: '20px' }}>
          <strong>Erreur :</strong> {error}
        </div>
      )}
      <h2 style={{ marginTop: 40, fontSize: 24, color: '#1e293b', fontWeight: 700 }}>Liste des utilisateurs</h2>
      <div style={{ overflowX: 'auto', marginTop: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', background: '#f1f5f9', padding: 12, borderRadius: 8, color: '#334155', fontWeight: 600 }}>Email</th>
              <th style={{ textAlign: 'left', background: '#f1f5f9', padding: 12, borderRadius: 8, color: '#334155', fontWeight: 600 }}>Rôle</th>
              <th style={{ textAlign: 'left', background: '#f1f5f9', padding: 12, borderRadius: 8, color: '#334155', fontWeight: 600 }}>Manager</th>
              <th style={{ textAlign: 'left', background: '#f1f5f9', padding: 12, borderRadius: 8, color: '#334155', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px #2563eb11' }}>
                <td style={{ padding: 12, fontWeight: 500, color: '#2563eb' }}>{user.email}</td>
                <td style={{ padding: 12 }}>
                  <select
                    value={user.role || ''}
                    onChange={e => {
                      const newRole = e.target.value;
                      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                    }}
                    style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f8fafc', fontWeight: 500 }}
                  >
                    <option value="commercial">Commercial</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="phoneur">Phoneur</option>
                  </select>
                </td>
                <td style={{ padding: 12 }}>
                  {user.role === 'commercial' ? (
                    <select
                      value={user.managerEmail || ''}
                      onChange={e => {
                        setUsers(users.map(u => u.id === user.id ? { ...u, managerEmail: e.target.value } : u));
                      }}
                      style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f8fafc', fontWeight: 500 }}
                    >
                      <option value="">Aucun manager</option>
                      {users.filter((u) => u.role === 'manager').map((m) => (
                        <option key={m.id} value={m.email}>{m.email}</option>
                      ))}
                    </select>
                  ) : (
                    <span style={{ color: '#64748b', fontStyle: 'italic' }}>—</span>
                  )}
                </td>
                <td style={{ padding: 12 }}>
                  <button
                    onClick={async () => {
                      try {
                        await setDoc(doc(db, 'users', user.id), {
                          email: user.email,
                          role: user.role,
                          managerEmail: user.role === 'commercial' ? user.managerEmail || '' : null,
                        }, { merge: true });
                        // Optionnel : toast ou message de succès
                      } catch (error) {
                        setError(error.message);
                      }
                    }}
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 18px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px #10b98122',
                      transition: 'background 0.15s',
                    }}
                  >
                    Enregistrer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}