import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import useDynamicTheme from "../utils/useDynamicTheme"; // ✅ Ajout du hook

export default function DataSolarDetail() {
  const router = useRouter();
  const { theme, isDark, isTwilight } = useDynamicTheme(); // ✅ Hook dynamique

  // Données réalistes
  const totalProduction = 5500; // kWh annuel
  const co2Saved = (totalProduction * 0.0005).toFixed(2);
  const kmDriven = (totalProduction * 0.9).toFixed(0);
  const washingMachines = (totalProduction * 0.5).toFixed(0);
  const treesPlanted = (totalProduction * 0.00015).toFixed(0);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : isTwilight ? "#222" : "#f0f0f0" },
      ]}
    >
      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FB8C00" />
        <Text
          style={[
            styles.backButtonText,
            { color: isDark ? "#eee" : "#FB8C00" },
          ]}
        >
          Retour
        </Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: "#FBC02D" }]}>
          Votre Impact Écologique
        </Text>

        {/* Cartes indicateurs */}
        <View
          style={[styles.card, { backgroundColor: isDark ? "#111" : "#fff" }]}
        >
          <Ionicons name="car-sport-outline" size={50} color="#FB8C00" />
          <Text style={[styles.cardValue, { color: isDark ? "#eee" : "#333" }]}>
            {kmDriven} km
          </Text>
          <Text style={[styles.cardLabel, { color: isDark ? "#aaa" : "#777" }]}>
            Parcourus en voiture
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: isDark ? "#111" : "#fff" }]}
        >
          <Ionicons name="water-outline" size={50} color="#66BB6A" />
          <Text style={[styles.cardValue, { color: isDark ? "#eee" : "#333" }]}>
            {washingMachines}
          </Text>
          <Text style={[styles.cardLabel, { color: isDark ? "#aaa" : "#777" }]}>
            Machines à laver
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: isDark ? "#111" : "#fff" }]}
        >
          <Ionicons name="leaf-outline" size={50} color="#4CAF50" />
          <Text style={[styles.cardValue, { color: isDark ? "#eee" : "#333" }]}>
            {treesPlanted}
          </Text>
          <Text style={[styles.cardLabel, { color: isDark ? "#aaa" : "#777" }]}>
            Arbres plantés (équivalent)
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: isDark ? "#111" : "#fff" }]}
        >
          <MaterialCommunityIcons
            name="cloud-outline"
            size={50}
            color="#2196F3"
          />
          <Text style={[styles.cardValue, { color: isDark ? "#eee" : "#333" }]}>
            {co2Saved} t
          </Text>
          <Text style={[styles.cardLabel, { color: isDark ? "#aaa" : "#777" }]}>
            CO₂ économisé
          </Text>
        </View>

        {/* Bouton vers Impact Écologique */}
        <View style={[styles.detailButton, { marginTop: 10 }]}>
          <TouchableOpacity
            style={[styles.detailButtonInner, { backgroundColor: "#4CAF50" }]}
            onPress={() => router.push("/impact-ecologique")}
          >
            <Ionicons name="leaf-outline" size={20} color="#fff" />
            <Text style={styles.detailButtonText}>
              Voir l'impact écologique
            </Text>
          </TouchableOpacity>
        </View>

        {/* Résumé Annuel */}
        <View style={[styles.summaryBox]}>
          <Text style={styles.summaryTitle}>Récapitulatif Annuel</Text>
          <Text style={styles.summaryValue}>{totalProduction} kWh</Text>
          <Text style={styles.summaryLabel}>Production totale</Text>
          <Text style={styles.summaryValue}>
            {(totalProduction * 0.1).toFixed(2)} €
          </Text>
          <Text style={styles.summaryLabel}>Revente estimée</Text>
        </View>
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
    marginBottom: 30,
    paddingTop: 40,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 10,
  },
  cardLabel: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 4,
  },
  detailButton: {
    marginTop: 30,
    alignItems: "center",
    marginBottom: 40,
  },
  detailButtonInner: {
    flexDirection: "row",
    backgroundColor: "#FB8C00",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
  },
  detailButtonText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "600",
  },
  summaryBox: {
    backgroundColor: "#FB8C00",
    padding: 24,
    borderRadius: 16,
    marginTop: 30,
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
  },
  summaryLabel: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
  },
});
