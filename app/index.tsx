import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PremiumBackground from "@/src/components/PremiumBackground";
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

export default function LandingScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 460,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
        Animated.timing(glowAnim, {
          toValue: 0.65,
          duration: 1300,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.quad),
        }),
      ]),
    ).start();
  }, [fadeAnim, glowAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <PremiumBackground />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.badge}>CASINO SOCIAL PREMIUM</Text>
        <Text style={styles.title}>LE TICKET GAGNANT</Text>
        <Text style={styles.tagline}>Plongez dans une expérience de jeu immersive, élégante et ultra compétitive.</Text>

        <View style={styles.highlightsRow}>
          <View style={styles.highlightPill}><Text style={styles.highlightText}>Dark Mode VIP</Text></View>
          <View style={styles.highlightPill}><Text style={styles.highlightText}>Roulette • Blackjack • Poker</Text></View>
        </View>

        <View style={styles.heroPanel}>
          <Text style={styles.heroPanelTitle}>Votre lounge est prêt.</Text>
          <Text style={styles.heroPanelSubtitle}>Connectez-vous pour retrouver vos jetons, vos stats et vos tables en direct.</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Tables</Text>
            <Text style={styles.metricValue}>12+</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Modes</Text>
            <Text style={styles.metricValue}>Live</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Lounge</Text>
            <Text style={styles.metricValue}>VIP</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.buttonGhost]} onPress={() => router.push("/login")}>
            <Text style={styles.buttonGhostText}>Connexion</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.buttonGold]} onPress={() => router.push("/register")}>
            <Animated.Text style={[styles.buttonGoldText, { opacity: glowAnim }]}>Inscription</Animated.Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#100f1a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    overflow: "hidden",
  },
  card: {
    width: "100%",
    maxWidth: 540,
    borderRadius: casinoTheme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(210, 187, 151, 0.35)",
    backgroundColor: "rgba(23, 21, 35, 0.94)",
    padding: 26,
    gap: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  badge: {
    alignSelf: "flex-start",
    color: "#d8b680",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  title: {
    color: "#f1d5a4",
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tagline: {
    color: "rgba(229, 220, 201, 0.84)",
    fontSize: 16,
    lineHeight: 24,
  },
  highlightsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  highlightPill: {
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.32)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(43, 40, 58, 0.82)",
  },
  highlightText: {
    color: "#efe8da",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroPanel: {
    borderWidth: 1,
    borderColor: "rgba(246, 220, 173, 0.38)",
    borderRadius: casinoTheme.radius.md,
    backgroundColor: "rgba(45, 39, 52, 0.85)",
    padding: 12,
    gap: 6,
  },
  heroPanelTitle: {
    color: "#f1d5a4",
    fontSize: 17,
    fontWeight: "900",
  },
  heroPanelSubtitle: {
    color: "rgba(231, 223, 204, 0.8)",
    fontSize: 13,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.22)",
    borderRadius: casinoTheme.radius.md,
    backgroundColor: "rgba(239, 233, 222, 0.08)",
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  metricLabel: {
    color: "rgba(231, 223, 204, 0.74)",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: "#f1d5a4",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: casinoTheme.radius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  buttonGhost: {
    borderColor: "rgba(214, 188, 150, 0.32)",
    backgroundColor: "rgba(239, 233, 222, 0.12)",
  },
  buttonGhostText: {
    color: "#f1d5a4",
    fontWeight: "900",
    fontSize: 16,
  },
  buttonGold: {
    borderColor: "rgba(246, 220, 173, 0.75)",
    backgroundColor: "#d6ab62",
    shadowColor: "#d7af6a",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonGoldText: {
    color: "#1e150f",
    fontWeight: "900",
    fontSize: 16,
  },
});
