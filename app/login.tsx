import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
  Animated,
  Easing,
    KeyboardAvoidingView,
  Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import PremiumBackground from "@/src/components/PremiumBackground";
import { authApi } from "@/src/services/authApi";
import { authStorage } from "@/src/services/authStorage";
import { casinoTheme } from "@/src/theme/casinoTheme";

const withAlpha = (hex: string, alpha: number): string => {
  const rgba = hex.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)$/i);
  if (rgba) {
    const red = Number.parseInt(rgba[1], 10);
    const green = Number.parseInt(rgba[2], 10);
    const blue = Number.parseInt(rgba[3], 10);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const safeHex = hex.replace("#", "");
  const value = safeHex.length === 3
    ? safeHex.split("").map((char) => char + char).join("")
    : safeHex;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return `rgba(255,255,255,${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(22)).current;
  const ctaPulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(cardY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(ctaPulse, {
          toValue: 0.92,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ]),
    ).start();
  }, [cardFade, cardY, ctaPulse]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    try {
      setLoading(true);

      const payload = await authApi.login(email, password);
      await authStorage.setSession(payload.token, payload.user);

      router.replace({
        pathname: "/home",
        params: {
          userId: payload.user.id,
          username: payload.user.username,
        },
      });
    } catch (error) {
      Alert.alert("Connexion impossible", error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PremiumBackground />

      <View style={styles.inner}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardFade,
              transform: [{ translateY: cardY }],
            },
          ]}
        >
          <Text style={styles.title}>LE TICKET GAGNANT</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre lounge casino</Text>

          <View style={styles.infoPanel}>
            <Text style={styles.infoPanelText}>Solde, progression et tables synchronisés avec votre compte.</Text>
          </View>

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

          <View style={styles.separator} />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <View style={styles.buttonGloss} />
            {loading ? (
              <ActivityIndicator color="#141824" />
            ) : (
              <Animated.Text style={[styles.buttonText, { opacity: ctaPulse }]}>Accéder au casino</Animated.Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.textLink} onPress={() => router.push("/register")}>
            <Text style={styles.textLinkLabel}>Pas encore de compte ? S'inscrire</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#100f1a",
    position: "relative",
    overflow: "hidden",
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
    borderColor: "rgba(210, 187, 151, 0.35)",
    borderRadius: casinoTheme.radius.xl,
    backgroundColor: "rgba(23, 21, 35, 0.94)",
    padding: 22,
    gap: 11,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    color: "#f1d5a4",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(229, 220, 201, 0.84)",
    marginBottom: 2,
    textAlign: "center",
  },
  infoPanel: {
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.32)",
    borderRadius: casinoTheme.radius.md,
    padding: 11,
    backgroundColor: "rgba(43, 40, 58, 0.82)",
  },
  infoPanelText: {
    color: "rgba(231, 223, 204, 0.8)",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: "rgba(217, 195, 160, 0.28)",
    borderRadius: casinoTheme.radius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "rgba(239, 233, 222, 0.12)",
    color: "#f5efe3",
  },
  button: {
    width: "100%",
    height: 52,
    backgroundColor: "#d6ab62",
    borderRadius: casinoTheme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(246, 220, 173, 0.75)",
    shadowColor: "#d7af6a",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
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
    color: "#1e150f",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  textLink: {
    marginTop: 4,
    alignItems: "center",
    paddingVertical: 4,
  },
  textLinkLabel: {
    color: "#d8b680",
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(214, 188, 150, 0.22)",
    marginTop: 1,
    marginBottom: 1,
  },
});
