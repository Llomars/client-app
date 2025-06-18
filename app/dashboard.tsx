import { FontAwesome } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Button,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

export default function Dashboard() {
  const router = useRouter();

  const [status, setStatus] = useState("signed");
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  // ✅ Titre animé
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "signed":
        return "#D5E1A3";
      case "dpValid":
        return "#A9C27D";
      case "inProgress":
        return "#7A9A55";
      case "delivered":
        return "#5B7C3D";
      case "installed":
        return "#3E5A2C";
      default:
        return "#D5E1A3";
    }
  };

  const statusIcons = {
    signed: "check",
    dpValid: "check-circle",
    inProgress: "truck",
    delivered: "gift",
    installed: "cogs",
  };

  const statusOrder = [
    "signed",
    "dpValid",
    "inProgress",
    "delivered",
    "installed",
  ];

  const calculateProgress = () => {
    const index = statusOrder.indexOf(status) + 1;
    return index / statusOrder.length;
  };

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        const token = await Notifications.getExpoPushTokenAsync();
        setExpoPushToken(token.data);
        console.log("Token push: ", token.data);
      }
    };
    getPermissions();
  }, []);

  const sendNotification = async () => {
    if (!expoPushToken) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Mise à jour du projet",
        body: "L'état de votre projet a été mis à jour.",
        data: { status },
      },
      trigger: null,
    });
  };

  useEffect(() => {
    if (status !== "signed") {
      sendNotification();
    }
  }, [status]);

  // ✅ Fonction pour simuler un changement de statut
  const nextStatus = () => {
    const currentIndex = statusOrder.indexOf(status);
    if (currentIndex < statusOrder.length - 1) {
      setStatus(statusOrder[currentIndex + 1]);
    } else {
      setStatus("signed");
    }
  };

  return (
    <ImageBackground
      source={require("../assets/fondpanneau.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <View style={styles.container}>
        <View style={styles.backButton}>
          <Button title="← Retour" onPress={() => router.back()} />
        </View>

        {/* ✅ Logo */}
        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* ✅ Titre animé */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: titleAnim,
              transform: [
                {
                  translateY: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Tableau de Bord Client
        </Animated.Text>

        <ScrollView contentContainerStyle={styles.dashboardContainer}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statut du projet</Text>

            <View style={styles.statusRow}>
              {statusOrder.map((statusItem, index) => (
                <View
                  key={index}
                  style={[
                    styles.statusItem,
                    { backgroundColor: getStatusColor(statusItem) },
                  ]}
                >
                  <FontAwesome
                    name={statusIcons[statusItem]}
                    size={16}
                    color={statusItem === status ? "#ffffff" : "#B0B0B0"}
                  />
                  <Text
                    style={[
                      styles.sectionText,
                      {
                        fontSize: 12,
                        color: statusItem === status ? "#fff" : "#B0B0B0",
                      },
                    ]}
                  >
                    {statusItem === "signed" && "Signé"}
                    {statusItem === "dpValid" && "DP Validé"}
                    {statusItem === "inProgress" && "En cours"}
                    {statusItem === "delivered" && "Livré"}
                    {statusItem === "installed" && "Installé"}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.datesSection}>
              <Text style={styles.datesText}>
                Livraison prévue : 15/02/2025
              </Text>
              <Text style={styles.datesText}>
                Installation prévue : 20/02/2025
              </Text>
            </View>

            {/* ✅ Nouvelle barre de progression */}
            <View style={styles.progressBarContainer}>
              <Progress.Bar
                progress={calculateProgress()}
                width={null}
                color="#4CAF50"
                unfilledColor="#E0E0E0"
                borderWidth={0}
                height={12}
                borderRadius={6}
                animated={true}
              />
            </View>

            {/* ✅ Bouton de refresh */}
            <TouchableOpacity style={styles.refreshButton} onPress={nextStatus}>
              <Text style={styles.refreshText}>🔄 Actualiser le statut</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  logo: {
    width: 200,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    marginTop: 10,
    fontFamily: "sans-serif-light",
  },
  dashboardContainer: {
    flexGrow: 1,
    paddingHorizontal: 25,
  },
  section: {
    backgroundColor: "#FFF",
    marginVertical: 12,
    padding: 25,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 15,
  },
  sectionText: {
    fontSize: 14,
    color: "#4A4A4A",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 15,
    flexWrap: "nowrap",
    paddingLeft: 10,
    paddingRight: 10,
  },
  statusItem: {
    flexDirection: "column",
    alignItems: "center",
    marginRight: 8,
    padding: 5,
    borderRadius: 8,
    width: 50,
    height: 80,
    justifyContent: "center",
  },
  progressBarContainer: {
    width: "100%",
    marginTop: 20,
  },
  datesSection: {
    marginTop: 15,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    textAlign: "center",
  },
  datesText: {
    fontSize: 14,
    color: "#4A4A4A",
  },
  refreshButton: {
    marginTop: 20,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  refreshText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
