import { useRouter } from "expo-router";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Button,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { db } from "../firebaseConfig";
import useDynamicTheme from "../utils/useDynamicTheme"; // ✅

export default function Parrainage() {
  const router = useRouter();
  const { isDark, isTwilight } = useDynamicTheme(); // ✅

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [ville, setVille] = useState("");
  const [commercial, setCommercial] = useState("");

  // ✅ Animation pour le logo
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(logoAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleSubmit = async () => {
    if (!nom || !prenom || !email || !telephone) {
      Alert.alert("Erreur", "Merci de remplir tous les champs obligatoires.");
      return;
    }

    try {
      await addDoc(collection(db, "parrainages"), {
        nom,
        prenom,
        email,
        telephone,
        ville,
        commercial,
        createdAt: Timestamp.now(),
        statut: "Nouveau",
      });

      Alert.alert("Succès", "Parrainage enregistré avec succès !");
      setNom("");
      setPrenom("");
      setEmail("");
      setTelephone("");
      setVille("");
      setCommercial("");
    } catch (err) {
      console.error("Erreur envoi parrainage", err);
      Alert.alert("Erreur", "Une erreur est survenue, réessayez.");
    }
  };

  return (
    <ImageBackground
      source={require("../assets/backPar.jpeg")}
      style={styles.background}
      resizeMode="cover"
    >
      {/* ✅ Overlay dynamique */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark
              ? "rgba(0,0,0,0.6)"
              : isTwilight
              ? "rgba(0,0,0,0.3)"
              : "rgba(0,0,0,0.2)",
          },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* ✅ Logo animé */}
          <Animated.Image
            source={require("../assets/logo.png")}
            style={[
              styles.logo,
              {
                opacity: logoAnim,
                transform: [
                  {
                    scale: logoAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
            resizeMode="contain"
          />

          {/* ✅ Formulaire */}
          <View style={styles.form}>
            <Button title="← Retour" onPress={() => router.back()} />
            <Text style={styles.title}>Formulaire de parrainage</Text>
            <Text style={styles.subtitle}>
              Recommandez-nous et partagez le soleil !
            </Text>

            <TextInput
              placeholder="Nom *"
              value={nom}
              onChangeText={setNom}
              style={styles.input}
              placeholderTextColor="#666"
            />
            <TextInput
              placeholder="Prénom *"
              value={prenom}
              onChangeText={setPrenom}
              style={styles.input}
              placeholderTextColor="#666"
            />
            <TextInput
              placeholder="Email *"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor="#666"
            />
            <TextInput
              placeholder="Téléphone *"
              keyboardType="phone-pad"
              value={telephone}
              onChangeText={setTelephone}
              style={styles.input}
              placeholderTextColor="#666"
            />
            <TextInput
              placeholder="Ville"
              value={ville}
              onChangeText={setVille}
              style={styles.input}
              placeholderTextColor="#666"
            />
            <TextInput
              placeholder="Nom du commercial"
              value={commercial}
              onChangeText={setCommercial}
              style={styles.input}
              placeholderTextColor="#666"
            />

            <View style={styles.btn}>
              <Button title="Envoyer" color="#28a745" onPress={handleSubmit} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    width: 200,
    height: 80,
    alignSelf: "center",
    marginBottom: 20,
  },
  form: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  btn: {
    marginTop: 10,
  },
});
