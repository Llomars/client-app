// ✅ app/AppNavigator.js

import { Button } from 'react-native';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';

// ✅ Écrans existants
import Avis from './avis';
import Dashboard from './dashboard';
import Index from './index'; // ton écran d'accueil avec tous tes boutons
import Parrainage from './parrainage';
import Sav from './sav';

// ✅ Nouveaux écrans pour le Profil Commercial
import CommercialDashboard from './pages/CommercialDashboard';
import Profile from './pages/Profile'; // Assure-toi que ton Profile.jsx est dans app/pages/Profile.jsx
import Register from './pages/Register';

// ✅ Création du Stack Navigator
const AppNavigator = createStackNavigator(
  {
    Index: {
      screen: Index,
    },
    Dashboard: {
      screen: Dashboard,
      navigationOptions: ({ navigation }) => ({
        title: 'Tableau de bord',
        headerLeft: () => (
          <Button
            onPress={() => navigation.goBack()}
            title="Retour"
            color="#000"
          />
        ),
      }),
    },
    Avis: {
      screen: Avis,
    },
    Parrainage: {
      screen: Parrainage,
    },
    Sav: {
      screen: Sav,
    },
    // ✅ Nouveaux écrans Auth/Profil
    Profile: {
      screen: Profile,
      navigationOptions: {
        title: 'Profil',
      },
    },
    Register: {
      screen: Register,
      navigationOptions: {
        title: 'Créer un compte',
      },
    },
    CommercialDashboard: {
      screen: CommercialDashboard,
      navigationOptions: {
        title: 'Mon Dashboard',
      },
    },
  },
  {
    initialRouteName: 'Index', // écran par défaut au lancement
  }
);

export default createAppContainer(AppNavigator);
