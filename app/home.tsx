import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChipBalanceBadge from "@/src/components/ChipBalanceBadge";
import { casinoTheme } from "@/src/theme/casinoTheme";

const BLACKJACK_API_URL = process.env.EXPO_PUBLIC_API_URL;
const FALLBACK_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";

const withAlpha = (hex: string, alpha: number): string => {
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

  const handleOpenMines = () => {
    router.push({
      pathname: "/mines",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  };

  const handleOpenCrash = () => {
    router.push({
      pathname: "/crash",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  };

  const handleOpenLuckyLadder = () => {
    router.push({
      pathname: "/lucky-ladder",
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gamesRow}
        >
          <TouchableOpacity
            style={[styles.gameCardHorizontal, { borderColor: withAlpha(casinoTheme.colors.red, 0.8) }]}
            onPress={handleGoToBlackjack}
          >
            <View style={styles.gameCardBackground}>
              <View style={[styles.gameBlobA, { backgroundColor: withAlpha(casinoTheme.colors.red, 0.35) }]} />
              <View style={[styles.gameBlobB, { backgroundColor: withAlpha(casinoTheme.colors.violet, 0.24) }]} />
              <View style={[styles.gameDiagonal, { backgroundColor: withAlpha(casinoTheme.colors.red, 0.18) }]} />

              <Text style={styles.gameIcon}>🂡</Text>

              <View style={styles.gameFooter}>
                <Text style={styles.gameTitleHorizontal}>BLACKJACK</Text>
                <Text style={styles.gameSubtitleHorizontal}>Cartes & décisions</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gameCardHorizontal, { borderColor: withAlpha(casinoTheme.colors.violet, 0.82) }]}
            onPress={handleOpenLuckyLadder}
          >
            <View style={styles.gameCardBackground}>
              <View style={[styles.gameBlobA, { backgroundColor: withAlpha(casinoTheme.colors.violet, 0.34) }]} />
              <View style={[styles.gameBlobB, { backgroundColor: withAlpha(casinoTheme.colors.cyan, 0.2) }]} />
              <View style={[styles.gameDiagonal, { backgroundColor: withAlpha(casinoTheme.colors.violet, 0.2) }]} />

              <Text style={styles.gameIcon}>🪜</Text>

              <View style={styles.gameFooter}>
                <Text style={styles.gameTitleHorizontal}>LUCKY LADDER</Text>
                <Text style={styles.gameSubtitleHorizontal}>Montez ou tombez</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gameCardHorizontal, { borderColor: withAlpha(casinoTheme.colors.cyan, 0.84) }]}
            onPress={handleOpenCrash}
          >
            <View style={styles.gameCardBackground}>
              <View style={[styles.gameBlobA, { backgroundColor: withAlpha(casinoTheme.colors.cyan, 0.28) }]} />
              <View style={[styles.gameBlobB, { backgroundColor: withAlpha(casinoTheme.colors.violet, 0.22) }]} />
              <View style={[styles.gameDiagonal, { backgroundColor: withAlpha(casinoTheme.colors.cyan, 0.18) }]} />

              <Text style={styles.gameIcon}>🚀</Text>

              <View style={styles.gameFooter}>
                <Text style={styles.gameTitleHorizontal}>CRASH</Text>
                <Text style={styles.gameSubtitleHorizontal}>Cashout avant chute</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gameCardHorizontal, { borderColor: withAlpha(casinoTheme.colors.gold, 0.82) }]}
            onPress={handleOpenRoulette}
          >
            <View style={styles.gameCardBackground}>
              <View style={[styles.gameBlobA, { backgroundColor: withAlpha(casinoTheme.colors.gold, 0.28) }]} />
              <View style={[styles.gameBlobB, { backgroundColor: withAlpha(casinoTheme.colors.red, 0.18) }]} />
              <View style={[styles.gameDiagonal, { backgroundColor: withAlpha(casinoTheme.colors.gold, 0.2) }]} />

              <Text style={styles.gameIcon}>🎯</Text>

              <View style={styles.gameFooter}>
                <Text style={styles.gameTitleHorizontal}>ROULETTE</Text>
                <Text style={styles.gameSubtitleHorizontal}>Table électro</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gameCardHorizontal, { borderColor: withAlpha(casinoTheme.colors.green, 0.82) }]}
            onPress={handleOpenMines}
          >
            <View style={styles.gameCardBackground}>
              <View style={[styles.gameBlobA, { backgroundColor: withAlpha(casinoTheme.colors.green, 0.28) }]} />
              <View style={[styles.gameBlobB, { backgroundColor: withAlpha(casinoTheme.colors.cyan, 0.16) }]} />
              <View style={[styles.gameDiagonal, { backgroundColor: withAlpha(casinoTheme.colors.green, 0.22) }]} />

              <Text style={styles.gameIcon}>💣</Text>

              <View style={styles.gameFooter}>
                <Text style={styles.gameTitleHorizontal}>MINES</Text>
                <Text style={styles.gameSubtitleHorizontal}>Risque progressif</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
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
  gamesRow: {
    gap: 12,
    paddingRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: casinoTheme.colors.text,
  },
  gameCardHorizontal: {
    width: 190,
    borderRadius: casinoTheme.radius.md,
    backgroundColor: casinoTheme.colors.panel,
    borderWidth: 1,
    borderColor: casinoTheme.colors.panelBorder,
    overflow: "hidden",
    minHeight: 250,
  },
  gameCardBackground: {
    minHeight: 250,
    backgroundColor: casinoTheme.colors.bgAlt,
    justifyContent: "space-between",
    padding: 12,
    position: "relative",
    overflow: "hidden",
  },
  gameBlobA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -80,
    right: -70,
  },
  gameBlobB: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: -85,
    left: -55,
  },
  gameDiagonal: {
    position: "absolute",
    width: 240,
    height: 44,
    top: 86,
    left: -20,
    transform: [{ rotate: "-18deg" }],
    borderRadius: 12,
  },
  gameIcon: {
    fontSize: 44,
    color: casinoTheme.colors.text,
    alignSelf: "flex-end",
    marginTop: 2,
  },
  gameFooter: {
    marginTop: "auto",
    gap: 2,
  },
  gameTitleHorizontal: {
    fontSize: 30,
    fontWeight: "900",
    color: casinoTheme.colors.text,
    letterSpacing: 0.8,
  },
  gameSubtitleHorizontal: {
    fontSize: 12,
    color: casinoTheme.colors.textMuted,
    fontWeight: "700",
    letterSpacing: 0.3,
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
