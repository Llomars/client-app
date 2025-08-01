import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db, storage } from "../firebaseConfig";
import useDynamicTheme from "../utils/useDynamicTheme";

export default function SAV() {
  const router = useRouter();
  const { isDark, isTwilight } = useDynamicTheme();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isAdminOnline, setIsAdminOnline] = useState(true);
  const [uploading, setUploading] = useState(false);

  const flatListRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, "sav-messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);

      msgs.forEach(async (msg) => {
        if (msg.admin && !msg.read) {
          const docRef = doc(db, "sav-messages", msg.id);
          await setDoc(docRef, { read: true }, { merge: true });
        }
      });
    });

    setIsAdminOnline(true);

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (message.trim() === "") return;

    await addDoc(collection(db, "sav-messages"), {
      text: message,
      createdAt: Timestamp.now(),
      admin: false,
      read: false,
    });

    setMessage("");
  };

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setUploading(true);
      try {
        for (const asset of result.assets) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          const filename = asset.uri.split("/").pop();
          const storageRef = ref(storage, `images/${Date.now()}_${filename}`);
          await uploadBytes(storageRef, blob);
          const downloadURL = await getDownloadURL(storageRef);

          await addDoc(collection(db, "sav-messages"), {
            imageUrl: downloadURL,
            createdAt: Timestamp.now(),
            admin: false,
            read: false,
          });
        }
      } catch (err) {
        console.error(err);
      }
      setUploading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isAdmin = item.admin === true;
    return (
      <View
        style={[
          styles.messageBubble,
          isAdmin ? styles.adminBubble : styles.clientBubble,
        ]}
      >
        {item.text && (
          <Text
            style={[
              styles.messageText,
              isAdmin ? styles.adminText : styles.clientText,
            ]}
          >
            {item.text}
          </Text>
        )}
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        )}
        {isAdmin && item.read && <Text style={styles.readReceipt}>✅ Vu</Text>}
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* ✅ Fond logo absolu */}
      <ImageBackground
        source={require("../assets/logo.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="contain" // ou "cover" si tu veux qu'il remplisse tout
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "transparent" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: "transparent" }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text
              style={[styles.backButton, { color: isDark ? "#eee" : "#333" }]}
            >
              ←
            </Text>
          </TouchableOpacity>

          <Text
            style={[styles.headerTitle, { color: isDark ? "#eee" : "#333" }]}
          >
            Service Après-Vente
          </Text>

          <View style={styles.statusDotContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isAdminOnline ? "#4CAF50" : "#ccc" },
              ]}
            />
            <Text style={{ marginLeft: 4, color: isDark ? "#eee" : "#333" }}>
              {isAdminOnline ? "Admin en ligne" : "Hors ligne"}
            </Text>
          </View>
        </View>

        {/* Chat */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          style={{ flex: 1, backgroundColor: "transparent" }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input */}
        <View
          style={[styles.inputContainer, { backgroundColor: "transparent" }]}
        >
          <TouchableOpacity onPress={pickImages} style={styles.addButton}>
            <Text style={styles.addButtonText}>📷</Text>
          </TouchableOpacity>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={
              uploading ? "Upload en cours..." : "Écrire un message..."
            }
            editable={!uploading}
            placeholderTextColor={isDark ? "#aaa" : "#666"}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? "#222" : "#fff",
                color: isDark ? "#fff" : "#333",
              },
            ]}
          />
          <TouchableOpacity
            style={[styles.sendButton, uploading && { opacity: 0.5 }]}
            onPress={sendMessage}
            disabled={uploading}
          >
            <Text style={styles.sendButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButton: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  statusDotContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageBubble: {
    borderRadius: 20,
    padding: 12,
    marginVertical: 5,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#4CAF50",
  },
  adminBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#E0E0E0",
  },
  messageText: {
    fontSize: 16,
  },
  clientText: {
    color: "#fff",
  },
  adminText: {
    color: "#333",
  },
  image: {
    width: 180,
    height: 180,
    marginTop: 8,
    borderRadius: 15,
  },
  readReceipt: {
    fontSize: 10,
    marginTop: 4,
    color: "#666",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    marginHorizontal: 10,
    fontSize: 16,
  },
  addButton: {
    padding: 6,
  },
  addButtonText: {
    fontSize: 24,
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
  },
});
