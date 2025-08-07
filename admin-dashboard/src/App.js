import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Clients from './pages/Clients';
import CommercialDashboard from './pages/CommercialDashboard';
import Parrainages from './pages/Parrainages';
import Performance from './pages/Performance';
import Profile from './pages/Profile';
import Register from './pages/Register';
import Stats from './pages/Stats';
import UserManagement from './pages/UserManagement';
import Plannings from './pages/plannings';
import EtudePerso from './pages/etude-perso';

import SAV from './pages/SAV';
import Logistique from './pages/Logistique';
import Calculateur from './pages/Calculateur';

console.log('🔍 Performance.jsx chargé');

export default function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/dashboard" element={<CommercialDashboard />} />
        <Route path="/parrainages" element={<Parrainages />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/register" element={<Register />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/plannings" element={<Plannings />} />
        <Route path="/etude-perso" element={<EtudePerso />} />
        <Route path="/sav" element={<SAV />} />
        <Route path="/logistique" element={<Logistique />} />
        <Route path="/calculateur" element={<Calculateur />} />
      </Routes>
    </Router>
  );
}
