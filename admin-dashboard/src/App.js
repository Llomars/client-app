import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Home from './pages/Home.js';
import Clients from './pages/Clients.js';
import CommercialDashboard from './pages/CommercialDashboard.js';
import MesClients from './pages/MesClients.js';
import Parrainages from './pages/Parrainages.js';
import Performance from './pages/Performance.js';
import Profile from './pages/Profile.js';
import Register from './pages/Register.js';
import Stats from './pages/Stats.js';
import UserManagement from './pages/UserManagement.js';
import Plannings from './pages/plannings.js';
import SAV from './pages/SAV.js';
import Logistique from './pages/Logistique.js';
import Calculateur from './pages/Calculateur.js';
import Relances from './pages/Relances.js';
import FaireProposition from './pages/FaireProposition.js';

console.log('🔍 Performance.jsx chargé');

export default function App() {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/dashboard" element={<CommercialDashboard />} />
        <Route path="/mes-clients" element={<MesClients />} />
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
        <Route path="/relances" element={<Relances />} />
        <Route path="/faire-proposition" element={<FaireProposition />} />
      </Routes>
    </Router>
  );
}
