import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useDynamicTheme from "../utils/useDynamicTheme"; // ✅ Ajout

export default function Ecomode() {
  const router = useRouter();
  const { isDark, isTwilight } = useDynamicTheme(); // ✅ Hook pour le thème

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : isTwilight ? "#222" : "#f0f0f0" },
      ]}
    >
      {/* Retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#4CAF50" />
        <Text style={[styles.backButtonText, { color: "#4CAF50" }]}>
          Retour
        </Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: "#4CAF50" }]}>
          Mode Éco Intelligent
        </Text>

        <Text style={[styles.paragraph, { color: isDark ? "#ccc" : "#555" }]}>
          Adaptez votre consommation pour profiter au maximum de votre
          installation solaire.
        </Text>

        {/* ✅ SECTION : Priorités */}
        <View
          style={[
            styles.section,
            styles.sectionAlt,
            { backgroundColor: isDark ? "#111" : "#f5f5f5" },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={24} color="#4CAF50" />
            <Text
              style={[styles.sectionTitle, { color: isDark ? "#eee" : "#333" }]}
            >
              Priorisez vos appareils
            </Text>
          </View>
          <Text
            style={[styles.sectionText, { color: isDark ? "#ccc" : "#555" }]}
          >
            Utilisez en priorité les appareils essentiels (frigo, éclairage LED)
            lorsque la production est faible.
          </Text>
        </View>

        {/* ✅ SECTION : Heures optimales */}
        <View
          style={[
            styles.section,
            { backgroundColor: isDark ? "#111" : "#fff" },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color="#4CAF50" />
            <Text
              style={[styles.sectionTitle, { color: isDark ? "#eee" : "#333" }]}
            >
              Heures optimales
            </Text>
          </View>
          <Text
            style={[styles.sectionText, { color: isDark ? "#ccc" : "#555" }]}
          >
            Lancez lave-linge, lave-vaisselle ou rechargez votre véhicule entre
            10h et 16h pour maximiser votre autoconsommation.
          </Text>
        </View>

        {/* ✅ SECTION : Surveillance Batterie */}
        <View
          style={[
            styles.section,
            styles.sectionAlt,
            { backgroundColor: isDark ? "#111" : "#f5f5f5" },
          ]}
        >
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="battery-charging"
              size={24}
              color="#4CAF50"
            />
            <Text
              style={[styles.sectionTitle, { color: isDark ? "#eee" : "#333" }]}
            >
              Protégez votre batterie
            </Text>
          </View>
          <Text
            style={[styles.sectionText, { color: isDark ? "#ccc" : "#555" }]}
          >
            Évitez d'utiliser vos appareils énergivores sur vos batteries :
            privilégiez leur utilisation quand vos panneaux produisent.
          </Text>
        </View>

        {/* ✅ SECTION : Astuce météo */}
        <View
          style={[
            styles.section,
            { backgroundColor: isDark ? "#111" : "#fff" },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="cloudy-outline" size={24} color="#4CAF50" />
            <Text
              style={[styles.sectionTitle, { color: isDark ? "#eee" : "#333" }]}
            >
              Anticipez la météo
            </Text>
          </View>
          <Text
            style={[styles.sectionText, { color: isDark ? "#ccc" : "#555" }]}
          >
            En cas de cyclone ou de mauvais temps prolongé, limitez la
            consommation non vitale pour préserver votre autonomie.
          </Text>
        </View>

        {/* ✅ Message final */}
        <Text style={[styles.footerText, { color: "#4CAF50" }]}>
          🌱 Adaptez votre quotidien pour des économies et une planète plus
          verte !
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 6,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    paddingTop: 40,
  },
  paragraph: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  sectionAlt: {
    // gris clair pour une case sur 2, déjà géré en JS dynamique
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "600",
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footerText: {
    fontSize: 16,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 30,
  },
});
