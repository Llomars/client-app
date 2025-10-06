import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import Clients from './pages/Clients.jsx';
import CommercialDashboard from './pages/CommercialDashboard.jsx';
import MesClients from './pages/MesClients.jsx';
import Parrainages from './pages/Parrainages.jsx';
import Performance from './pages/Performance.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import Stats from './pages/Stats.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Plannings from './pages/plannings.jsx';
import SAV from './pages/SAV.jsx';
import Logistique from './pages/Logistique.jsx';
import Calculateur from './pages/Calculateur.jsx';
import Relances from './pages/Relances.jsx';
import FaireProposition from './pages/FaireProposition.jsx';
import ClientsChauds from './pages/ClientsChauds.jsx';

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
        <Route path="/sav" element={<SAV />} />
        <Route path="/logistique" element={<Logistique />} />
        <Route path="/calculateur" element={<Calculateur />} />
        <Route path="/relances" element={<Relances />} />
        <Route path="/faire-proposition" element={<FaireProposition />} />
        <Route path="/clients-chauds" element={<ClientsChauds />} />
      </Routes>
    </Router>
  );
}
