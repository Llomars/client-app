import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* ✅ GIF en arrière-plan */}
      <Image
        source={require("../assets/dwnl.gif.download/backg.gif")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* ✅ Ton logo */}
      <Image source={require("../assets/logo.png")} style={styles.logo} />

      {/* ✅ Organisation des boutons en 3 lignes */}
      <View style={styles.buttonContainer}>
        {/* Première ligne avec 2 boutons */}
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

        {/* Deuxième ligne avec 2 boutons */}
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

        {/* Troisième ligne avec 1 bouton centré */}
        <View style={styles.centerButtonRow}>
          <CustomButton
            icon={<FontAwesome5 name="solar-panel" size={24} color="#fff" />}
            text="Données Solaires"
            onPress={() => router.push("/data-solar")}
            style={styles.rectangleButton}
          />
        </View>
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
    backgroundColor: "#fff",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
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
});
