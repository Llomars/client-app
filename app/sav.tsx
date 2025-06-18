// ✅ TOUS LES IMPORTS EN HAUT
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    Button,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db, storage } from '../firebaseConfig';

// ✅ ENSUITE UNE SEULE FOIS : export default function SAV()
export default function SAV() {
  const router = useRouter(); // ✅ Hook de retour

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'sav-messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(msgs);
    });

    return unsubscribe;
  }, []);

  const sendMessage = async () => {
    if (message.trim() === '') return;

    await addDoc(collection(db, 'sav-messages'), {
      text: message,
      createdAt: Timestamp.now(),
      admin: false,
    });

    setMessage('');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled) {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const filename = result.assets[0].uri.split('/').pop();
      const storageRef = ref(storage, `images/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'sav-messages'), {
        imageUrl: downloadURL,
        createdAt: Timestamp.now(),
        admin: false,
      });
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
        {item.text && <Text style={styles.messageText}>{item.text}</Text>}
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        )}
      </View>
    );
  };

  return (
  <KeyboardAvoidingView
    style={styles.container}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={100}
  >
    {/* ✅ Barre fixe haut avec retour */}
    <View style={styles.header}>
      <Button title="← Retour" onPress={() => router.back()} />
      <Text style={styles.headerTitle}>Service Après-Vente</Text>
    </View>

    {/* ✅ Chat scrollable */}
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 20 }}
    />

    {/* ✅ Zone input */}
    <View style={styles.inputContainer}>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder="Écrire un message..."
        style={styles.input}
      />
      <Button title="Envoyer" onPress={sendMessage} />
      <TouchableOpacity onPress={pickImage} style={styles.addButton}>
        <Text style={styles.addButtonText}>📷</Text>
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
);

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageBubble: {
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  clientBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#D1E7DD',
  },
  adminBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#F8D7DA',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  image: {
    width: 200,
    height: 200,
    marginTop: 8,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  addButton: {
    marginLeft: 5,
  },
  addButtonText: {
    fontSize: 24,
  },
});
