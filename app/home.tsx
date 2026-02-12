import { useRouter } from "expo-router";
import { ImageBackground, ScrollView, StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";
import { casinoTheme } from "./casinoTheme";

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = () => {
    router.replace("/login");
  };

  const handleGoToBlackjack = () => {
    router.push("/blackjack");
  };

  const handleOpenRoulette = () => {
    router.push("/roulette");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.backgroundLayerA} />
      <View style={styles.backgroundLayerB} />

      <Text style={styles.title}>Casino Premium</Text>
      <Text style={styles.subtitle}>Sélectionne ton jeu et mise tes jetons</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>SOLDE ACTUEL</Text>
        <Text style={styles.balance}>1 000 jetons</Text>
      </View>

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
              uri: "https://images.unsplash.com/photo-1605870445919-838d190e8e1e?auto=format&fit=crop&w=800&q=80",
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
              uri: "https://images.unsplash.com/photo-1606167668584-78701c57f13d?auto=format&fit=crop&w=800&q=80",
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
    fontSize: 30,
    fontWeight: "900",
    color: casinoTheme.colors.cyan,
    letterSpacing: 0.8,
  },
  subtitle: {
    color: casinoTheme.colors.textMuted,
    marginTop: -4,
    marginBottom: 6,
  },
  balanceCard: {
    borderWidth: 1,
    borderColor: casinoTheme.colors.panelBorder,
    borderRadius: casinoTheme.radius.lg,
    backgroundColor: casinoTheme.colors.panel,
    padding: 14,
  },
  balanceLabel: {
    color: casinoTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.7,
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
