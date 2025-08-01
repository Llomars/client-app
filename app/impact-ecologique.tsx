import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useDynamicTheme from "../utils/useDynamicTheme"; // ✅ Hook pour thème dynamique

export default function ImpactEcologique() {
  const router = useRouter();
  const { isDark, isTwilight } = useDynamicTheme();

  // === DONNÉES EXEMPLE ===
  const totalCO2Saved = 820; // en kg
  const equivalentTrees = Math.round(totalCO2Saved / 20);
  const carKmAvoided = Math.round(totalCO2Saved * 5);
  const lightDays = Math.round(totalCO2Saved * 2);

  const ecoImpacts = [
    {
      title: "CO₂ économisé",
      value: `${totalCO2Saved} kg`,
      icon: "leaf-outline",
      color: "#4CAF50",
    },
    {
      title: "Arbres plantés équivalents",
      value: `${equivalentTrees}`,
      icon: "tree-outline",
      color: "#81C784",
    },
    {
      title: "Km voiture évités",
      value: `${carKmAvoided} km`,
      icon: "car-outline",
      color: "#FF9800",
    },
    {
      title: "Jours d'éclairage",
      value: `${lightDays} jours`,
      icon: "bulb-outline",
      color: "#FFD54F",
    },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : isTwilight ? "#222" : "#f0f0f0" },
      ]}
    >
      {/* === Bouton Retour === */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FB8C00" />
        <Text style={[styles.backButtonText, { color: "#FB8C00" }]}>
          Retour
        </Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text
          style={[
            styles.title,
            { color: isDark || isTwilight ? "#4CAF50" : "#4CAF50" },
          ]}
        >
          Impact Écologique
        </Text>

        {ecoImpacts.map((item, idx) => (
          <View
            key={idx}
            style={[styles.card, { backgroundColor: isDark ? "#111" : "#fff" }]}
          >
            <Ionicons
              name={item.icon}
              size={40}
              color={item.color}
              style={styles.cardIcon}
            />
            <View style={styles.cardContent}>
              <Text
                style={[styles.cardTitle, { color: isDark ? "#eee" : "#333" }]}
              >
                {item.title}
              </Text>
              <Text style={[styles.cardValue, { color: item.color }]}>
                {item.value}
              </Text>
            </View>
          </View>
        ))}

        <Text
          style={[
            styles.congratsText,
            { color: isDark || isTwilight ? "#ccc" : "#666" },
          ]}
        >
          🎉 Bravo ! Continuez à produire de l'énergie propre et à protéger la
          planète.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, paddingHorizontal: 16 },
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
    marginBottom: 30,
    textAlign: "center",
    paddingTop: 40,
  },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardIcon: {
    marginRight: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 4,
  },
  congratsText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 50,
  },
});
