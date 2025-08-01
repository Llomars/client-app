import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Animatable from "react-native-animatable";
import Modal from "react-native-modal";
import { db, storage } from "../firebaseConfig";
import useDynamicTheme from "../utils/useDynamicTheme";

export default function Avis() {
  const router = useRouter();
  const { isDark, isTwilight } = useDynamicTheme();

  const defaultAvisList = [
    {
      id: "local1",
      name: "Pierre Dupont",
      text: "Très satisfait du service, l'installation s'est très bien passée!",
      image: "https://via.placeholder.com/100",
      rating: 5,
    },
    {
      id: "local2",
      name: "Marie Martin",
      text: "Service impeccable, à recommander!",
      image: "https://via.placeholder.com/100",
      rating: 4,
    },
    {
      id: "local3",
      name: "Jean Pierre",
      text: "Un peu déçu, l'installation a pris plus de temps que prévu.",
      image: "https://via.placeholder.com/100",
      rating: 3,
    },
  ];

  const [avisList, setAvisList] = useState(defaultAvisList);
  const [isModalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "avis"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const avis = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      if (avis.length > 0) {
        setAvisList(avis);
      } else {
        setAvisList(defaultAvisList);
      }
    });

    return unsubscribe;
  }, []);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleAddReview = async () => {
    if (!name.trim() || !text.trim() || rating === 0) {
      Alert.alert(
        "Erreur",
        "Merci de remplir tous les champs et choisir une note."
      );
      return;
    }

    let photoURL = "https://via.placeholder.com/100";
    if (avatar) {
      const response = await fetch(avatar);
      const blob = await response.blob();
      const filename = `avatars/${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      photoURL = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "avis"), {
      name,
      text,
      rating,
      image: photoURL,
      createdAt: serverTimestamp(),
    });

    setName("");
    setText("");
    setRating(0);
    setAvatar(null);
    toggleModal();
  };

  return (
    <LinearGradient
      colors={
        isDark
          ? ["#000000", "#111111"]
          : isTwilight
          ? ["#222", "#444"]
          : ["#F9F6F3", "#EDEDED"]
      }
      style={styles.gradientBackground}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: isDark || isTwilight ? "#333" : "#fff",
            },
          ]}
          onPress={() => router.back()}
        >
          <FontAwesome
            name="arrow-left"
            size={20}
            color={isDark || isTwilight ? "#eee" : "#333"}
          />
        </TouchableOpacity>

        <Text style={[styles.title, { color: isDark ? "#eee" : "#4A4A4A" }]}>
          Avis Clients
        </Text>

        <ScrollView contentContainerStyle={styles.avisContainer}>
          {avisList.map((avis, index) => (
            <Animatable.View
              key={avis.id}
              animation="fadeInUp"
              delay={index * 200}
              style={[
                styles.avisCard,
                {
                  backgroundColor: isDark
                    ? "#111"
                    : isTwilight
                    ? "#333"
                    : "#FFFFFF",
                  shadowColor: isDark || isTwilight ? "#000" : "#888",
                },
              ]}
            >
              <View style={styles.avisHeader}>
                <Image source={{ uri: avis.image }} style={styles.avisImage} />
                <Text
                  style={[
                    styles.avisName,
                    { color: isDark || isTwilight ? "#fff" : "#333" },
                  ]}
                >
                  {avis.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.avisText,
                  { color: isDark || isTwilight ? "#ccc" : "#4A4A4A" },
                ]}
              >
                “{avis.text}”
              </Text>
              <View style={styles.rating}>
                {[...Array(5)].map((_, starIndex) => (
                  <FontAwesome
                    key={starIndex}
                    name="star"
                    size={20}
                    color={
                      starIndex < avis.rating
                        ? "#FFD700"
                        : isDark
                        ? "#555"
                        : "#ccc"
                    }
                    style={{ marginRight: 4 }}
                  />
                ))}
              </View>
            </Animatable.View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.addReviewButton} onPress={toggleModal}>
          <FontAwesome name="plus" size={18} color="#fff" />
          <Text style={styles.addReviewText}>Ajouter un avis</Text>
        </TouchableOpacity>

        <Modal
          isVisible={isModalVisible}
          onBackdropPress={toggleModal}
          style={{ justifyContent: "center", alignItems: "center" }}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: isDark ? "#111" : "#fff",
              },
            ]}
          >
            <Text
              style={[styles.modalTitle, { color: isDark ? "#fff" : "#333" }]}
            >
              Nouvel Avis
            </Text>

            <TouchableOpacity onPress={pickAvatar} style={styles.avatarPicker}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarPreview} />
              ) : (
                <>
                  <FontAwesome name="user-circle" size={50} color="#888" />
                  <Text style={{ color: "#888", marginTop: 5 }}>
                    Choisir une photo
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              placeholder="Votre nom"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              style={[styles.input, { color: isDark ? "#fff" : "#333" }]}
            />
            <TextInput
              placeholder="Votre avis"
              placeholderTextColor="#999"
              value={text}
              onChangeText={setText}
              style={[
                styles.input,
                styles.textArea,
                { color: isDark ? "#fff" : "#333" },
              ]}
              multiline
            />
            <View style={styles.modalRating}>
              {[...Array(5)].map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setRating(index + 1)}
                >
                  <FontAwesome
                    name="star"
                    size={28}
                    color={index < rating ? "#FFD700" : "#ccc"}
                    style={{ marginHorizontal: 4 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleAddReview}
            >
              <Text style={styles.sendButtonText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
  },
  avisContainer: {
    flexGrow: 1,
    width: "100%",
    paddingBottom: 80,
  },
  avisCard: {
    marginVertical: 10,
    padding: 20,
    borderRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  avisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avisImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  avisName: {
    fontSize: 20,
    fontWeight: "600",
  },
  avisText: {
    fontSize: 16,
    fontStyle: "italic",
    lineHeight: 22,
  },
  rating: {
    flexDirection: "row",
    marginTop: 12,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    bottom: 30,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 5,
  },
  addReviewText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 8,
    fontWeight: "bold",
  },
  modalContent: {
    width: "90%",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  avatarPicker: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    backgroundColor: "#f9f9f9",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalRating: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
