// app/avis.js
import { FontAwesome } from "@expo/vector-icons"; // Pour les étoiles
import { useRouter } from "expo-router";
import React from "react";
import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function Avis() {
  const router = useRouter();

  // Exemple d'avis avec texte et note
  const avisList = [
    {
      id: 1,
      name: "Pierre Dupont",
      text: "Très satisfait du service, l'installation s'est très bien passée!",
      image: "https://via.placeholder.com/100",
      rating: 5,
    },
    {
      id: 2,
      name: "Marie Martin",
      text: "Service impeccable, à recommander!",
      image: "https://via.placeholder.com/100",
      rating: 4,
    },
    {
      id: 3,
      name: "Jean Pierre",
      text: "Un peu déçu, l'installation a pris plus de temps que prévu.",
      image: "https://via.placeholder.com/100",
      rating: 3,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Le bouton retour */}
      <View style={styles.backButton}>
        <Button title="← Retour" onPress={() => router.back()} />
      </View>

      <Text style={styles.title}>Avis Clients</Text>

      <ScrollView contentContainerStyle={styles.avisContainer}>
        {avisList.map((avis) => (
          <View key={avis.id} style={styles.avisCard}>
            <View style={styles.avisHeader}>
              <Image source={{ uri: avis.image }} style={styles.avisImage} />
              <Text style={styles.avisName}>{avis.name}</Text>
            </View>
            <Text style={styles.avisText}>“{avis.text}”</Text>
            <View style={styles.rating}>
              {[...Array(avis.rating)].map((_, index) => (
                <FontAwesome
                  key={index}
                  name="star"
                  size={20}
                  color="#FF7F7F"
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    backgroundColor: "#F9F6F3", // Blanc cassé avec une touche de rose subtil
    paddingTop: 40,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 20,
  },
  avisContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  avisCard: {
    backgroundColor: "#FFF", // Fond blanc pour les cartes
    marginVertical: 10,
    padding: 20,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avisImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  avisName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A4A4A",
  },
  avisText: {
    fontSize: 16,
    color: "#4A4A4A",
    marginBottom: 10,
    fontStyle: "italic", // Pour imiter les guillemets
  },
  rating: {
    flexDirection: "row",
    marginTop: 10,
  },
});
