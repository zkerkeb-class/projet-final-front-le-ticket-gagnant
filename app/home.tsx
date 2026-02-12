import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChipBalanceBadge from "@/src/components/ChipBalanceBadge";
import { casinoTheme } from "./casinoTheme";

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

  const handleOpenRoulette = () => {
    router.push({
      pathname: "/roulette",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.backgroundLayerA} />
      <View style={styles.backgroundLayerB} />

      <View style={styles.balanceBadgeWrap}>
        <ChipBalanceBadge userId={resolvedUserId} />
      </View>

      <Text style={styles.title}>🎰 Bienvenue au Casino !</Text>
      {username ? <Text style={styles.subtitle}>Connecté en tant que {username}</Text> : null}
      <Text style={styles.balance}>{balanceText}</Text>

      <View style={styles.gamesContainer}>
        <Text style={styles.sectionTitle}>Jeux disponibles</Text>

        <TouchableOpacity style={styles.gameCard}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1596838132731-3301c3fd4317?auto=format&fit=crop&w=800&q=80",
            }}
            resizeMode="cover"
            imageStyle={styles.gameImageStyle}
            style={styles.gameImage}
          >
            <View style={styles.gameOverlay}>
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>Machine à sous</Text>
                <Text style={styles.gameSubtitle}>Jackpots instantanés</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gameCard} onPress={handleGoToBlackjack}>
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1529480780361-c8cb81eb5735?auto=format&fit=crop&w=1600&q=80",
            }}
            resizeMode="cover"
            imageStyle={styles.gameImageStyle}
            style={styles.gameImage}
          >
            <View style={styles.gameOverlay}>
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>Blackjack</Text>
                <Text style={styles.gameSubtitle}>Table stratégique</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.gameCard, styles.featuredCard]} onPress={handleOpenRoulette}>
          <ImageBackground
            source={{
              uri: "https://images.pexels.com/photos/3279691/pexels-photo-3279691.jpeg?auto=compress&cs=tinysrgb&w=1600",
            }}
            resizeMode="cover"
            imageStyle={styles.gameImageStyle}
            style={styles.gameImage}
          >
            <View style={[styles.gameOverlay, styles.featuredOverlay]}>
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>Roulette électronique</Text>
                <Text style={styles.gameSubtitle}>Expérience immersive</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: casinoTheme.colors.bg,
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 30,
    position: "relative",
  },
  balanceBadgeWrap: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 4,
  },
  backgroundLayerA: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: casinoTheme.colors.bg,
  },
  backgroundLayerB: {
    position: "absolute",
    top: -120,
    left: -120,
    right: -120,
    height: 360,
    borderRadius: 200,
    backgroundColor: "rgba(74,132,255,0.14)",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: casinoTheme.colors.cyan,
    letterSpacing: 0.6,
    marginTop: 20,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: casinoTheme.colors.textMuted,
    marginBottom: 8,
  },
  balance: {
    fontSize: 26,
    color: casinoTheme.colors.green,
    fontWeight: "900",
    marginTop: 2,
  },
  gamesContainer: {
    width: "100%",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: casinoTheme.colors.text,
  },
  gameCard: {
    width: "100%",
    borderRadius: casinoTheme.radius.md,
    backgroundColor: casinoTheme.colors.panel,
    borderWidth: 1,
    borderColor: casinoTheme.colors.panelBorder,
    overflow: "hidden",
    minHeight: 128,
  },
  featuredCard: {
    borderColor: casinoTheme.colors.gold,
  },
  gameImage: {
    minHeight: 128,
    justifyContent: "flex-end",
  },
  gameImageStyle: {
    objectFit: "cover",
  },
  gameOverlay: {
    backgroundColor: "rgba(5, 8, 14, 0.54)",
    padding: 12,
    minHeight: 128,
    justifyContent: "flex-end",
  },
  featuredOverlay: {
    backgroundColor: "rgba(22, 14, 6, 0.48)",
  },
  gameInfo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  gameTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: casinoTheme.colors.text,
  },
  gameSubtitle: {
    marginTop: 2,
    color: casinoTheme.colors.textMuted,
    fontSize: 12,
  },
  logoutButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: casinoTheme.radius.md,
    borderWidth: 1,
    borderColor: casinoTheme.colors.red,
    alignItems: "center",
    backgroundColor: "rgba(70,18,30,0.45)",
  },
  logoutText: {
    color: casinoTheme.colors.red,
    fontSize: 15,
    fontWeight: "800",
  },
});
