import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryLegend,
} from "victory-native"; // ✅ pas "victory"

export default function DataSolar() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const months = [
    { month: "Janvier", consumption: 300 },
    { month: "Février", consumption: 350 },
    { month: "Mars", consumption: 450 },
    { month: "Avril", consumption: 500 },
    { month: "Mai", consumption: 600 },
    { month: "Juin", consumption: 700 },
  ].map((m) => {
    const extra = Math.floor(m.consumption * (0.05 + Math.random() * 0.25));
    return {
      ...m,
      surplus: extra,
      production: m.consumption + extra,
    };
  });

  const edfPricePerKwh = 0.150425;
  const annualSubscription = 134.16;
  const monthlySubscription = annualSubscription / 12;
  const surplusSellPrice = 0.1;

  const dataConsumption = months.map((m) => ({
    x: m.month.substring(0, 3),
    y: m.consumption,
  }));
  const dataSurplus = months.map((m) => ({
    x: m.month.substring(0, 3),
    y: m.surplus,
  }));

  const totalConsumption = months.reduce((sum, m) => sum + m.consumption, 0);
  const totalSurplus = months.reduce((sum, m) => sum + m.surplus, 0);
  const totalProduced = months.reduce((sum, m) => sum + m.production, 0);
  const totalEDF = months.reduce(
    (sum, m) => sum + m.production * edfPricePerKwh + monthlySubscription,
    0
  );
  const totalGain = totalSurplus * surplusSellPrice;

  return (
    <LinearGradient
      colors={["#f0f0f0", "#d9d9d9", "#ffffff"]}
      style={styles.container}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#FB8C00" />
        <Text style={styles.backButtonText}>Retour</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Données Solaires</Text>

        <Text style={styles.subtitle}>Consommation & Surplus (kWh)</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ paddingVertical: 20 }}>
            <VictoryChart width={screenWidth * 1.4} domainPadding={{ x: 40 }}>
              <VictoryAxis
                style={{ tickLabels: { fontSize: 12, fill: "#333" } }}
              />
              <VictoryAxis
                dependentAxis
                style={{ tickLabels: { fontSize: 12, fill: "#333" } }}
              />
              <VictoryGroup offset={20} colorScale={["#FBC02D", "#66BB6A"]}>
                <VictoryBar data={dataConsumption} />
                <VictoryBar data={dataSurplus} />
              </VictoryGroup>
              <VictoryLegend
                x={50}
                y={0}
                orientation="horizontal"
                gutter={20}
                data={[
                  { name: "Consommation", symbol: { fill: "#FBC02D" } },
                  { name: "Surplus", symbol: { fill: "#66BB6A" } },
                ]}
              />
            </VictoryChart>
          </View>
        </ScrollView>

        <Text style={styles.subtitle}>Détail par mois</Text>

        <ScrollView horizontal>
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                Mois
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                Conso.
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                Surplus
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                Total
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                EDF (€)
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                Gain (€)
              </Text>
            </View>

            {months.map((item, idx) => {
              const edfCost = (
                item.production * edfPricePerKwh +
                monthlySubscription
              ).toFixed(2);
              const surplusGain = (item.surplus * surplusSellPrice).toFixed(2);
              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.month}</Text>
                  <Text style={styles.tableCell}>{item.consumption}</Text>
                  <Text style={styles.tableCell}>{item.surplus}</Text>
                  <Text style={styles.tableCell}>{item.production}</Text>
                  <Text style={styles.tableCell}>{edfCost} €</Text>
                  <Text style={styles.tableCell}>{surplusGain} €</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>
            <Ionicons name="cash-outline" size={20} color="#FB8C00" /> Résumé
            Annuel
          </Text>
          <Text style={styles.summaryText}>
            Consommation totale : {totalConsumption} kWh
          </Text>
          <Text style={styles.summaryText}>
            Surplus total : {totalSurplus} kWh
          </Text>
          <Text style={styles.summaryText}>
            Total produit : {totalProduced} kWh
          </Text>
          <Text style={styles.summaryText}>
            Coût EDF (avec abonnement) : {totalEDF.toFixed(2)} €
          </Text>
          <Text style={styles.summaryText}>
            Gain du surplus : {totalGain.toFixed(2)} €
          </Text>
        </View>

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
    </LinearGradient>
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
    color: "#FB8C00",
    fontSize: 16,
    marginLeft: 6,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#FBC02D",
    paddingTop: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
    color: "#FB8C00",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#FB8C00",
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCell: {
    minWidth: 70,
    textAlign: "center",
    fontSize: 12,
  },
  summaryBox: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 8,
    marginTop: 30,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#FB8C00",
  },
  summaryText: {
    fontSize: 14,
    marginBottom: 4,
    color: "#333",
  },
  detailButton: {
    marginTop: 30,
    alignItems: "center",
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
