import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ChipBalanceBadge from "@/src/components/ChipBalanceBadge";
import PremiumBackground from "@/src/components/PremiumBackground";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { authStorage } from "@/src/services/authStorage";
import { casinoTheme } from "@/src/theme/casinoTheme";

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

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ userId?: string | string[]; username?: string | string[] }>();
  const authChecked = useRequireAuth();
  const heroFade = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(16)).current;
  const cardsProgress = useRef(new Animated.Value(0)).current;

  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const username = Array.isArray(params.username) ? params.username[0] : params.username;
  const resolvedUserId = userId ?? FALLBACK_USER_ID;

  const handleLogout = useCallback(async () => {
    await authStorage.clearSession();
    router.replace("/login");
  }, [router]);

  const handleGoToBlackjack = useCallback(() => {
    router.push({
      pathname: "/blackjack",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenRoulette = useCallback(() => {
    router.push({
      pathname: "/roulette",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenMines = useCallback(() => {
    router.push({
      pathname: "/mines",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenCrash = useCallback(() => {
    router.push({
      pathname: "/crash",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenLuckyLadder = useCallback(() => {
    router.push({
      pathname: "/lucky-ladder",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenPoker = useCallback(() => {
    router.push({
      pathname: "/poker",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenBaccarat = useCallback(() => {
    router.push({
      pathname: "/baccarat",
      params: {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
      },
    });
  }, [resolvedUserId, router]);

  const handleOpenProfile = useCallback(() => {
    router.push("/profile");
  }, [router]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerProfileButton} onPress={handleOpenProfile}>
            <Text style={styles.headerProfileText}>Mon compte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerLogoutButton} onPress={() => void handleLogout()}>
            <Text style={styles.headerLogoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, handleOpenProfile, handleLogout]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroFade, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(heroY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(cardsProgress, {
        toValue: 1,
        duration: 950,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [heroFade, heroY, cardsProgress]);

  if (!authChecked) {
    return (
      <View style={styles.screen}>
        <PremiumBackground />
      </View>
    );
  }

  const gameCards = [
    {
      key: "blackjack",
      icon: "🂡",
      title: "BLACKJACK",
      subtitle: "Cartes & décisions",
      border: "rgba(176, 110, 102, 0.8)",
      blobA: "rgba(130, 82, 76, 0.4)",
      blobB: "rgba(89, 70, 120, 0.3)",
      diagonal: "rgba(124, 78, 74, 0.26)",
      onPress: handleGoToBlackjack,
    },
    {
      key: "ladder",
      icon: "🪜",
      title: "LUCKY LADDER",
      subtitle: "Montez ou tombez",
      border: "rgba(122, 98, 165, 0.82)",
      blobA: "rgba(98, 78, 140, 0.38)",
      blobB: "rgba(112, 92, 153, 0.24)",
      diagonal: "rgba(92, 74, 130, 0.24)",
      onPress: handleOpenLuckyLadder,
    },
    {
      key: "crash",
      icon: "🚀",
      title: "CRASH",
      subtitle: "Cashout avant chute",
      border: "rgba(173, 136, 93, 0.8)",
      blobA: "rgba(119, 93, 63, 0.35)",
      blobB: "rgba(94, 76, 130, 0.26)",
      diagonal: "rgba(136, 106, 74, 0.24)",
      onPress: handleOpenCrash,
    },
    {
      key: "roulette",
      icon: "🎯",
      title: "ROULETTE",
      subtitle: "Table électro",
      border: "rgba(196, 161, 103, 0.82)",
      blobA: "rgba(141, 115, 72, 0.34)",
      blobB: "rgba(126, 79, 76, 0.22)",
      diagonal: "rgba(156, 127, 82, 0.24)",
      onPress: handleOpenRoulette,
    },
    {
      key: "mines",
      icon: "💣",
      title: "MINES",
      subtitle: "Risque progressif",
      border: "rgba(140, 149, 106, 0.82)",
      blobA: "rgba(92, 99, 70, 0.34)",
      blobB: "rgba(116, 96, 73, 0.22)",
      diagonal: "rgba(107, 114, 81, 0.24)",
      onPress: handleOpenMines,
    },
    {
      key: "poker",
      icon: "🃏",
      title: "POKER",
      subtitle: "Texas Hold'em Pro",
      border: "rgba(186, 152, 98, 0.8)",
      blobA: "rgba(127, 102, 67, 0.3)",
      blobB: "rgba(90, 72, 127, 0.24)",
      diagonal: "rgba(138, 112, 73, 0.22)",
      onPress: handleOpenPoker,
    },
    {
      key: "baccarat",
      icon: "🃟",
      title: "BACCARAT",
      subtitle: "Player / Banker / Tie",
      border: "rgba(145, 120, 191, 0.82)",
      blobA: "rgba(97, 80, 141, 0.36)",
      blobB: "rgba(120, 90, 145, 0.22)",
      diagonal: "rgba(111, 90, 152, 0.24)",
      onPress: handleOpenBaccarat,
    },
  ] as const;

  return (
    <View style={styles.screen}>
      <PremiumBackground />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Animated.View style={[styles.heroCard, { opacity: heroFade, transform: [{ translateY: heroY }] }] }>
        <View style={styles.heroTopRow}>
          <Text style={styles.heroBadge}>LOUNGE LIVE</Text>
          <View style={styles.heroBalanceWrap}>
            <ChipBalanceBadge userId={resolvedUserId} />
          </View>
        </View>
        <Text style={styles.title}>🎰 Bienvenue au Casino !</Text>
        {username ? <Text style={styles.subtitle}>Connecté en tant que {username}</Text> : null}
        <Text style={styles.heroHint}>Choisissez votre table et lancez votre session premium.</Text>
      </Animated.View>

      <View style={styles.gamesContainer}>
        <View style={styles.sectionShell}>
          <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Jeux disponibles</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>MODE VIP</Text>
          </View>
        </View>

          <View style={styles.statsRow}>
            <View style={styles.statPill}><Text style={styles.statPillText}>12 tables live</Text></View>
            <View style={styles.statPill}><Text style={styles.statPillText}>Tournois actifs</Text></View>
            <View style={styles.statPill}><Text style={styles.statPillText}>Multiplicateurs x20</Text></View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gamesRow}
        >
          {gameCards.map((game, index) => {
            const start = index * 0.08;
            const end = Math.min(start + 0.35, 1);

            const opacity = cardsProgress.interpolate({
              inputRange: [start, end],
              outputRange: [0, 1],
              extrapolate: "clamp",
            });

            const translateY = cardsProgress.interpolate({
              inputRange: [start, end],
              outputRange: [16, 0],
              extrapolate: "clamp",
            });

            const scale = cardsProgress.interpolate({
              inputRange: [start, end],
              outputRange: [0.96, 1],
              extrapolate: "clamp",
            });

            return (
              <Animated.View key={game.key} style={{ opacity, transform: [{ translateY }, { scale }] }}>
                <TouchableOpacity
                  style={[styles.gameCardHorizontal, { borderColor: game.border }]}
                  onPress={game.onPress}
                >
                  <View style={styles.gameCardBackground}>
                    <View style={[styles.gameBlobA, { backgroundColor: game.blobA }]} />
                    <View style={[styles.gameBlobB, { backgroundColor: game.blobB }]} />
                    <View style={[styles.gameDiagonal, { backgroundColor: game.diagonal }]} />
                    <View style={styles.gameGloss} />

                    <Text style={styles.gameIcon}>{game.icon}</Text>

                    <View style={styles.gameFooter}>
                      <Text style={styles.gameTitleHorizontal}>{game.title}</Text>
                      <Text style={styles.gameSubtitleHorizontal}>{game.subtitle}</Text>
                      <Text style={styles.gameCta}>JOUER</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 20,
    position: "relative",
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  headerProfileButton: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.42)",
    backgroundColor: "rgba(239, 233, 222, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerProfileText: {
    color: "#f1d5a4",
    fontSize: 12,
    fontWeight: "800",
  },
  headerLogoutButton: {
    minHeight: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(202, 120, 111, 0.72)",
    backgroundColor: "rgba(93, 39, 43, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerLogoutText: {
    color: "#e3b1aa",
    fontSize: 12,
    fontWeight: "800",
  },
  heroCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(210, 187, 151, 0.35)",
    borderRadius: casinoTheme.radius.lg,
    backgroundColor: "rgba(23, 21, 35, 0.94)",
    padding: 14,
    gap: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  heroBalanceWrap: {
    transform: [{ scale: 0.9 }],
    marginTop: -4,
    marginRight: -4,
  },
  heroBadge: {
    color: "#d8b680",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#f1d5a4",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(229, 220, 201, 0.84)",
  },
  heroHint: {
    marginTop: 6,
    color: "rgba(231, 223, 204, 0.82)",
    fontSize: 13,
    fontWeight: "600",
  },
  gamesContainer: {
    width: "100%",
    gap: 12,
  },
  sectionShell: {
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.24)",
    borderRadius: casinoTheme.radius.md,
    backgroundColor: "rgba(43, 40, 58, 0.58)",
    padding: 10,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionBadge: {
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.gold, 0.6),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: withAlpha(casinoTheme.colors.gold, 0.12),
  },
  sectionBadgeText: {
    color: casinoTheme.colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  statPill: {
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.7),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: withAlpha(casinoTheme.colors.bgAlt, 0.76),
  },
  statPillText: {
    color: withAlpha(casinoTheme.colors.text, 0.9),
    fontSize: 11,
    fontWeight: "700",
  },
  gamesRow: {
    gap: 14,
    paddingRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: casinoTheme.colors.text,
  },
  gameCardHorizontal: {
    width: 206,
    borderRadius: casinoTheme.radius.md,
    backgroundColor: "rgba(23, 21, 35, 0.94)",
    borderWidth: 1,
    borderColor: casinoTheme.colors.panelBorder,
    overflow: "hidden",
    minHeight: 268,
    shadowColor: casinoTheme.colors.bg,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  gameCardBackground: {
    minHeight: 268,
    backgroundColor: "rgba(34, 30, 48, 0.95)",
    justifyContent: "space-between",
    padding: 13,
    position: "relative",
    overflow: "hidden",
  },
  gameGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "35%",
    backgroundColor: "rgba(255,255,255,0.08)",
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
    fontSize: 48,
    color: casinoTheme.colors.text,
    alignSelf: "flex-end",
    marginTop: 2,
  },
  gameFooter: {
    marginTop: "auto",
    gap: 2,
  },
  gameTitleHorizontal: {
    fontSize: 28,
    fontWeight: "900",
    color: "#efe8da",
    letterSpacing: 0.8,
  },
  gameSubtitleHorizontal: {
    fontSize: 12,
    color: "rgba(231, 223, 204, 0.76)",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  gameCta: {
    marginTop: 6,
    color: "#f1d5a4",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
});
