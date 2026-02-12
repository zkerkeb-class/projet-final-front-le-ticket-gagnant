import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";

const BLACKJACK_API_URL = process.env.EXPO_PUBLIC_API_URL;
const FALLBACK_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";

const getApiBaseUrls = (): string[] => {
  if (BLACKJACK_API_URL) {
    return [BLACKJACK_API_URL.replace(/\/games\/blackjack\/?$/, "")];
  }

  if (Platform.OS === "android") {
    return ["http://10.0.2.2:3000/api", "http://localhost:3000/api", "http://127.0.0.1:3000/api"];
  }

  return ["http://localhost:3000/api", "http://127.0.0.1:3000/api"];
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string | string[]; username?: string | string[] }>();
  const [balanceText, setBalanceText] = useState("Solde : ...");

  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const resolvedUserId = userId ?? FALLBACK_USER_ID;

  const handleLogout = () => {
    router.replace("/login");
  };

  const handleGoToBlackjack = () => {
    router.push({
      pathname: "/blackjack",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  };

  const loadBalance = useCallback(async () => {
    const baseUrls = getApiBaseUrls();

    for (const baseUrl of baseUrls) {
      try {
        const query = resolvedUserId ? `?userId=${encodeURIComponent(resolvedUserId)}` : "";
        const response = await fetch(`${baseUrl}/users/balance${query}`);
        if (!response.ok) {
          continue;
        }

        const data = await response.json() as { chipBalance?: number };
        if (typeof data.chipBalance === "number") {
          setBalanceText(`Solde : ${data.chipBalance.toFixed(2)} jetons`);
          return;
        }
      } catch {
        continue;
      }
    }

    setBalanceText("Solde : indisponible");
  }, [resolvedUserId]);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [loadBalance]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎰 Bienvenue au Casino !</Text>
      {username ? <Text style={styles.subtitle}>Connecté en tant que {username}</Text> : null}
      <Text style={styles.balance}>{balanceText}</Text>

      <View style={styles.gamesContainer}>
        <Text style={styles.sectionTitle}>Jeux disponibles</Text>

        <TouchableOpacity style={styles.gameCard}>
          <Text style={styles.gameEmoji}>🎰</Text>
          <Text style={styles.gameTitle}>Machine à sous</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gameCard} onPress={handleGoToBlackjack}>
          <Text style={styles.gameEmoji}>🃏</Text>
          <Text style={styles.gameTitle}>Blackjack</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gameCard}>
          <Text style={styles.gameEmoji}>🎯</Text>
          <Text style={styles.gameTitle}>Roulette</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  balance: {
    fontSize: 20,
    color: "#4CAF50",
    fontWeight: "600",
    marginBottom: 32,
  },
  gamesContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  gameCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    marginBottom: 12,
  },
  gameEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
  },
  logoutButton: {
    marginTop: "auto",
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e74c3c",
  },
  logoutText: {
    color: "#e74c3c",
    fontSize: 16,
    fontWeight: "600",
  },
});
