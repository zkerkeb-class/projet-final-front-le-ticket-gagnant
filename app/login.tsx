import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";

const BLACKJACK_API_URL = process.env.EXPO_PUBLIC_API_URL;

const getApiBaseUrls = (): string[] => {
  if (BLACKJACK_API_URL) {
    return [BLACKJACK_API_URL.replace(/\/games\/blackjack\/?$/, "")];
  }

  if (Platform.OS === "android") {
    return ["http://10.0.2.2:3000/api", "http://localhost:3000/api", "http://127.0.0.1:3000/api"];
  }

  return ["http://localhost:3000/api", "http://127.0.0.1:3000/api"];
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const baseUrls = getApiBaseUrls();

    try {
      setLoading(true);

      for (const baseUrl of baseUrls) {
        try {
          const response = await fetch(`${baseUrl}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          });

          const data = await response.json() as { userId?: string; username?: string; message?: string };

          if (!response.ok) {
            if (response.status === 401 || response.status === 400) {
              Alert.alert("Connexion impossible", data.message ?? "Identifiants invalides.");
              return;
            }

            continue;
          }

          if (!data.userId) {
            Alert.alert("Erreur", "Réponse login invalide.");
            return;
          }

          router.replace({
            pathname: "/home",
            params: {
              userId: data.userId,
              username: data.username ?? "",
            },
          });
          return;
        } catch {
          continue;
        }
      }

      Alert.alert("Erreur", "Backend indisponible. Vérifiez que l'API est lancée.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>🎰 Le Ticket Gagnant</Text>
        <Text style={styles.subtitle}>Connectez-vous pour jouer</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Se connecter</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 32,
  },
  input: {
    width: "100%",
    maxWidth: 400,
    height: 50,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  button: {
    width: "100%",
    maxWidth: 400,
    height: 50,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
