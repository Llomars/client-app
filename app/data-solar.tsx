import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import useDynamicTheme from "../utils/useDynamicTheme"; // ✅ Ton hook dynamique

export default function DataSolar() {
  const router = useRouter();
  const { theme, isDark, isTwilight } = useDynamicTheme(); // ✅ Hook appelé
  const screenWidth = Dimensions.get("window").width;

  // === DATA ===
  const months = [
    { month: "Janvier", consumption: 300 },
    { month: "Février", consumption: 350 },
    { month: "Mars", consumption: 450 },
    { month: "Avril", consumption: 500 },
    { month: "Mai", consumption: 600 },
    { month: "Juin", consumption: 700 },
  ].map((m) => {
    const extra = Math.floor(m.consumption * (0.1 + Math.random() * 0.3));
    return {
      ...m,
      surplus: extra,
      production: m.consumption + extra,
    };
  });

  const surplusSellPrice = 0.1;
  const totalConsumption = months.reduce((sum, m) => sum + m.consumption, 0);
  const totalSurplus = months.reduce((sum, m) => sum + m.surplus, 0);
  const totalProduced = totalConsumption + totalSurplus;
  const totalRevenue = (totalSurplus * surplusSellPrice).toFixed(2);

  // Horaire (24h) — labels toutes les 2h
  const hours = Array.from({ length: 12 }, (_, i) => `${i * 2}h`);
  const solarProductionPerHour = [0, 0, 1, 6, 14, 15, 14, 10, 4, 1, 0, 0];

  // Alerte Cyclone
  const [cycloneAlert, setCycloneAlert] = useState(false);

  useEffect(() => {
    setCycloneAlert(false); // À brancher sur une API plus tard
  }, []);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : isTwilight ? "#222" : "#fff" },
      ]}
    >
      {/* Retour */}
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
        <Text style={[styles.title, { color: isDark ? "#FBC02D" : "#FBC02D" }]}>
          Analyse Production
        </Text>

        {/* Alerte Cyclone */}
        <View style={styles.cycloneContainer}>
          <Ionicons
            name={cycloneAlert ? "warning-outline" : "cloud-outline"}
            size={24}
            color="#fff"
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cycloneTitle}>Alerte Cyclonique ⚠️</Text>
            <Text style={styles.cycloneMessage}>
              {cycloneAlert
                ? "Un cyclone approche. Limitez votre consommation et sécurisez vos équipements."
                : "Aucun cyclone prévu pour le moment. Vous serez notifié en cas de danger."}
            </Text>
          </View>
        </View>

        {/* Production sur 24h */}
        <Text
          style={[styles.subtitle, { color: isDark ? "#FB8C00" : "#FB8C00" }]}
        >
          Production sur 24h
        </Text>

        <LineChart
          data={{
            labels: hours,
            datasets: [
              {
                data: solarProductionPerHour,
                color: (opacity = 1) => `rgba(251, 192, 45, ${opacity})`,
                strokeWidth: 2,
              },
            ],
            legend: ["Production horaire (2h)"],
          }}
          width={screenWidth - 32}
          height={280}
          yAxisSuffix=" kWh"
          chartConfig={{
            backgroundGradientFrom: isDark ? "#000" : "#fff",
            backgroundGradientTo: isDark ? "#000" : "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) =>
              isDark
                ? `rgba(255,255,255,${opacity})`
                : `rgba(0,0,0,${opacity})`,
            labelColor: (opacity = 1) =>
              isDark
                ? `rgba(255,255,255,${opacity})`
                : `rgba(0,0,0,${opacity})`,
            propsForDots: {
              r: "3",
              strokeWidth: "2",
              stroke: "#FBC02D",
            },
          }}
          bezier
          style={{
            marginVertical: 20,
            borderRadius: 16,
          }}
        />

        {/* Graphes jauges */}
        <Text
          style={[styles.subtitle, { color: isDark ? "#FB8C00" : "#FB8C00" }]}
        >
          Production par Mois
        </Text>

        {months.map((item, idx) => {
          const surplusRevenue = (item.surplus * surplusSellPrice).toFixed(2);
          const totalWidth = screenWidth - 50;
          const consoWidth = (item.consumption / item.production) * totalWidth;
          const surplusWidth = (item.surplus / item.production) * totalWidth;

          return (
            <View key={idx} style={styles.jaugeContainer}>
              <Text
                style={[styles.monthLabel, { color: isDark ? "#eee" : "#333" }]}
              >
                {item.month}
              </Text>
              <Text style={styles.revenueText}>+ {surplusRevenue} €</Text>
              <View style={styles.jaugeBar}>
                <View style={[styles.consoBar, { width: consoWidth }]} />
                <View style={[styles.surplusBar, { width: surplusWidth }]} />
              </View>
              <View style={styles.jaugeValues}>
                <Text
                  style={[
                    styles.jaugeValue,
                    { color: isDark ? "#ccc" : "#666" },
                  ]}
                >
                  Conso: {item.consumption} kWh
                </Text>
                <Text
                  style={[
                    styles.jaugeValue,
                    { color: isDark ? "#ccc" : "#666" },
                  ]}
                >
                  Surplus: {item.surplus} kWh
                </Text>
              </View>
            </View>
          );
        })}

        {/* Récap Annuel */}
        <Text
          style={[styles.subtitle, { color: isDark ? "#FB8C00" : "#FB8C00" }]}
        >
          Récapitulatif Annuel
        </Text>

        <View style={styles.jaugeContainer}>
          <Text style={styles.revenueText}>
            Total Revente: + {totalRevenue} €
          </Text>
          <View style={styles.jaugeBar}>
            <View
              style={[
                styles.consoBar,
                {
                  width:
                    (totalConsumption / totalProduced) * (screenWidth - 50),
                },
              ]}
            />
            <View
              style={[
                styles.surplusBar,
                { width: (totalSurplus / totalProduced) * (screenWidth - 50) },
              ]}
            />
          </View>
          <View style={styles.jaugeValues}>
            <Text
              style={[styles.jaugeValue, { color: isDark ? "#ccc" : "#666" }]}
            >
              Conso: {totalConsumption} kWh
            </Text>
            <Text
              style={[styles.jaugeValue, { color: isDark ? "#ccc" : "#666" }]}
            >
              Surplus: {totalSurplus} kWh
            </Text>
          </View>
        </View>

        {/* Bouton détails */}
        <View style={styles.detailButton}>
          <TouchableOpacity
            style={styles.detailButtonInner}
            onPress={() => router.push("/data-solar-detail")}
          >
            <Ionicons name="analytics-outline" size={20} color="#fff" />
            <Text style={styles.detailButtonText}>Voir plus de détails</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Styles identiques
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
    marginBottom: 20,
    textAlign: "center",
    paddingTop: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
  },
  cycloneContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF7043",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  cycloneTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  cycloneMessage: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
  },
  jaugeContainer: {
    marginBottom: 30,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  revenueText: {
    fontSize: 14,
    color: "#66BB6A",
    marginBottom: 4,
  },
  jaugeBar: {
    flexDirection: "row",
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  consoBar: {
    height: 20,
    backgroundColor: "#FBC02D",
  },
  surplusBar: {
    height: 20,
    backgroundColor: "#66BB6A",
  },
  jaugeValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  jaugeValue: {
    fontSize: 12,
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
});
