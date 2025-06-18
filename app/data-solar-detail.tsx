import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Button,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import { LineChart } from "react-native-chart-kit";

export default function DataSolarDetail() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  const dailyData = {
    labels: ["1", "5", "10", "15", "20", "25", "30"],
    datasets: [
      {
        data: [20, 30, 50, 40, 60, 70, 65],
        strokeWidth: 2,
      },
    ],
  };

  const kWhProduced = 650;
  const annualProduction = kWhProduced * 12;
  const basePricePerKwh = 0.150425;
  const annualIncrease = 0.05;
  const projectionYears = 20;

  let totalSavings = 0;
  let pricePerKwh = basePricePerKwh;

  for (let year = 1; year <= projectionYears; year++) {
    totalSavings += annualProduction * pricePerKwh;
    pricePerKwh *= 1 + annualIncrease;
  }

  const sunshineHours = 220;
  const avgTemp = 18;
  const eqCarKm = kWhProduced * 6;
  const eqWasher = kWhProduced * 2;

  return (
    <LinearGradient
      colors={["#f0f0f0", "#d9d9d9", "#ffffff"]} // ✅ Fond gris clair élégant
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Button title="← Retour" onPress={() => router.back()} />

        <Animatable.Text animation="fadeInDown" style={styles.title}>
          🌞 Détails pour Avril
        </Animatable.Text>

        <Animatable.View animation="fadeInUp" delay={100} style={styles.card}>
          <View style={styles.iconRow}>
            <MaterialIcons name="trending-up" size={24} color="#FB8C00" />
            <Text style={styles.cardTitle}>Variation</Text>
          </View>
          <Text style={styles.cardText}>
            +18% de production par rapport à Mars
          </Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={200} style={styles.card}>
          <View style={styles.iconRow}>
            <Ionicons name="analytics" size={24} color="#FB8C00" />
            <Text style={styles.cardTitle}>Production quotidienne (kWh)</Text>
          </View>
          <LineChart
            data={dailyData}
            width={screenWidth - 64}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={300} style={styles.card}>
          <View style={styles.iconRow}>
            <Ionicons name="sunny" size={24} color="#FBC02D" />
            <Text style={styles.cardTitle}>Conditions météo</Text>
          </View>
          <Text style={styles.cardText}>
            Heures d'ensoleillement : {sunshineHours} h
          </Text>
          <Text style={styles.cardText}>Température moyenne : {avgTemp}°C</Text>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={400} style={styles.card}>
          <View style={styles.iconRow}>
            <Ionicons name="swap-horizontal" size={24} color="#FBC02D" />
            <Text style={styles.cardTitle}>Équivalences</Text>
          </View>
          <Text style={styles.cardText}>
            🚗 {eqCarKm} km en voiture électrique
          </Text>
          <Text style={styles.cardText}>
            🧺 {eqWasher} cycles de machine à laver
          </Text>
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          delay={500}
          style={styles.cardGradient}
        >
          <LinearGradient
            colors={["#e0e0e0", "#ffffff"]}
            style={styles.gradientBox}
          >
            <View style={styles.iconRow}>
              <Ionicons name="cash-outline" size={24} color="#FB8C00" />
              <Text style={styles.cardTitle}>
                Projection sur {projectionYears} ans
              </Text>
            </View>
            <Text style={styles.cardText}>
              Production estimée : {annualProduction * projectionYears} kWh
            </Text>
            <Text style={styles.cardText}>
              Économie EDF estimée (+5%/an) : {totalSavings.toFixed(2)} €
            </Text>
          </LinearGradient>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={600} style={styles.card}>
          <View style={styles.iconRow}>
            <Ionicons name="download-outline" size={24} color="#FB8C00" />
            <Text style={styles.cardTitle}>Exporter</Text>
          </View>
          <Button title="Exporter en PDF (à venir)" onPress={() => {}} />
          <View style={{ height: 10 }} />
          <Button title="Exporter en CSV (à venir)" onPress={() => {}} />
        </Animatable.View>
      </ScrollView>
    </LinearGradient>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(251, 188, 45, ${opacity})`, // jaune solaire pour la ligne
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: "#FBC02D",
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#FBC02D", // ✅ Jaune solaire pour le titre principal
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardGradient: {
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 10,
  },
  gradientBox: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    color: "#FB8C00", // ✅ Orange doux pour sous-titres
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
});
