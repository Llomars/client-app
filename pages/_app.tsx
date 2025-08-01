import type { AppProps } from 'next/app'
import FloatingButtons from '../components/FloatingButtons'
import '../styles/globals.css'
import { useEffect, useState } from 'react';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useRouter } from 'next/router';

function RoleRouter({ Component, pageProps }) {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Remplacez ceci par votre logique d'authentification réelle
    const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    setUser(storedUser);
    if (storedUser && storedUser.uid) {
      getDoc(doc(db, 'users', storedUser.uid)).then(snap => {
        setRole(snap.data()?.role || '');
      });
    }
  }, []);

  useEffect(() => {
    if (role === 'phoneur') {
      router.replace('/admin-dashboard/src/pages/PhoneurClients');
    }
  }, [role, router]);

  if (!user) return <div>Connexion requise</div>;
  if (!role) return <div>Chargement du profil...</div>;
  if (role === 'phoneur') return null;
  return <Component {...pageProps} />;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <FloatingButtons />
      <RoleRouter Component={Component} pageProps={pageProps} />
    </>
  )
}

export default MyApp