import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import useDynamicTheme from "../utils/useDynamicTheme"; // ✅ on centralise !

export default function Home() {
  const router = useRouter();

  // ✅ Données pour la barre
  const currentConsumption = 5;
  const currentProduction = 4;
  const maxValue = 10;
  const consumptionWidth = `${(currentConsumption / maxValue) * 100}%`;
  const productionWidth = `${(currentProduction / maxValue) * 100}%`;

  // ✅ Utilise le hook pour tout centraliser
  const { isDark, isTwilight } = useDynamicTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : isTwilight ? "#222" : "#fff" },
      ]}
    >
      {/* ✅ GIF de fond */}
      <Image
        source={require("../assets/dwnl.gif.download/Video.gif")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* ✅ Overlay pour assombrir */}
      {(isDark || isTwilight) && (
        <View
          style={[
            styles.overlay,
            { backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.3)" },
          ]}
        />
      )}

      {/* ✅ Logo */}
      <Image source={require("../assets/logo.png")} style={styles.logo} />

      {/* ✅ Boutons */}
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <CustomButton
            icon={<Ionicons name="chatbubbles" size={24} color="#fff" />}
            text="SAV"
            onPress={() => router.push("/sav")}
            style={styles.squareButton}
          />
          <CustomButton
            icon={<MaterialIcons name="dashboard" size={24} color="#fff" />}
            text="Tableau de bord"
            onPress={() => router.push("/dashboard")}
            style={styles.squareButton}
          />
        </View>

        <View style={styles.buttonRow}>
          <CustomButton
            icon={<FontAwesome5 name="star" size={24} color="#fff" />}
            text="Avis"
            onPress={() => router.push("/avis")}
            style={styles.squareButton}
          />
          <CustomButton
            icon={<Ionicons name="gift" size={24} color="#fff" />}
            text="Parrainage"
            onPress={() => router.push("/parrainage")}
            style={styles.squareButton}
          />
        </View>

        <View style={styles.centerButtonRow}>
          <CustomButton
            icon={<FontAwesome5 name="solar-panel" size={24} color="#fff" />}
            text="Données Solaires"
            onPress={() => router.push("/data-solar")}
            style={styles.rectangleButton}
          />
        </View>

        <View style={styles.centerButtonRow}>
          <CustomButton
            icon={<Ionicons name="leaf-outline" size={24} color="#fff" />}
            text="Eco Mode"
            onPress={() => router.push("/Ecomode")}
            style={styles.ecoButton}
          />
        </View>
      </View>

      {/* ✅ Barre de production */}
      <View style={styles.productionBarContainer}>
        <View style={styles.barBackground}>
          <View style={[styles.consumptionBar, { width: consumptionWidth }]} />
          <View style={[styles.productionBar, { width: productionWidth }]} />
        </View>
        <Text
          style={[
            styles.barLabel,
            { color: isDark || isTwilight ? "#eee" : "#333" },
          ]}
        >
          Consommation : {currentConsumption} kW — Production :{" "}
          {currentProduction} kW
        </Text>
      </View>
    </View>
  );
}

type CustomButtonProps = {
  icon: React.ReactNode;
  text: string;
  onPress: () => void;
  style?: object;
};

function CustomButton({ icon, text, onPress, style }: CustomButtonProps) {
  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    position: "relative",
    paddingTop: 50,
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  logo: {
    width: 400,
    height: 160,
    resizeMode: "contain",
    marginBottom: 30,
    zIndex: 1,
  },
  buttonContainer: {
    width: "80%",
    zIndex: 1,
    marginTop: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  squareButton: {
    width: "45%",
    backgroundColor: "rgba(107, 142, 35, 0.7)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  rectangleButton: {
    width: "90%",
    backgroundColor: "rgba(255, 215, 0, 0.7)",
    marginTop: 30,
    paddingVertical: 18,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  ecoButton: {
    width: "60%",
    backgroundColor: "rgba(76, 175, 80, 0.8)",
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    flexShrink: 1,
    paddingTop: 6,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    alignSelf: "center",
  },
  centerButtonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  productionBarContainer: {
    position: "absolute",
    bottom: 80,
    width: "80%",
    alignItems: "center",
  },
  barBackground: {
    width: "100%",
    height: 20,
    backgroundColor: "#ddd",
    borderRadius: 10,
    overflow: "hidden",
    flexDirection: "row",
  },
  consumptionBar: {
    height: "100%",
    backgroundColor: "#FBC02D",
  },
  productionBar: {
    height: "100%",
    backgroundColor: "#66BB6A",
  },
  barLabel: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
});
