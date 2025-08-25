
import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ClientsList from '../components/ClientsList';

export default function Clients() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [commerciaux, setCommerciaux] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult();
        setUserRole(idTokenResult.claims.role || '');
      } else {
        setUserRole('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'users')).then(snap => {
      setCommerciaux(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div>
      <ClientsList user={user} userRole={userRole} commerciaux={commerciaux} />
    </div>
  );
}
