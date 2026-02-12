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
import { casinoTheme } from "./casinoTheme";

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
      <View style={styles.backgroundLayerA} />
      <View style={styles.backgroundLayerB} />

      <View style={styles.inner}>
        <View style={styles.card}>
          <Text style={styles.title}>LE TICKET GAGNANT</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre lounge casino</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={casinoTheme.colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor={casinoTheme.colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <View style={styles.buttonGloss} />
            {loading ? (
              <ActivityIndicator color="#141824" />
            ) : (
              <Text style={styles.buttonText}>Accéder au casino</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: casinoTheme.colors.bg,
    position: "relative",
  },
  backgroundLayerA: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: casinoTheme.colors.bg,
  },
  backgroundLayerB: {
    position: "absolute",
    top: -120,
    left: -110,
    right: -110,
    height: 360,
    borderRadius: 220,
    backgroundColor: "rgba(74, 132, 255, 0.15)",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "transparent",
  },
  card: {
    width: "100%",
    maxWidth: 430,
    borderWidth: 1,
    borderColor: casinoTheme.colors.panelBorder,
    borderRadius: casinoTheme.radius.xl,
    backgroundColor: casinoTheme.colors.panel,
    padding: 20,
    gap: 12,
  },
  title: {
    color: casinoTheme.colors.cyan,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: casinoTheme.colors.textMuted,
    marginBottom: 6,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: casinoTheme.colors.inputBorder,
    borderRadius: casinoTheme.radius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: casinoTheme.colors.inputBg,
    color: casinoTheme.colors.text,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: casinoTheme.colors.gold,
    borderRadius: casinoTheme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    overflow: "hidden",
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonGloss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "46%",
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  buttonText: {
    color: "#141824",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
