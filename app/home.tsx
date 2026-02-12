import { useRouter } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

import { Text, View } from "@/components/Themed";

export default function HomeScreen() {
  const router = useRouter();

  const handleLogout = () => {
    router.replace("/login");
  };

  const handleGoToBlackjack = () => {
    router.push("/blackjack");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎰 Bienvenue au Casino !</Text>
      <Text style={styles.balance}>Solde : 1 000 jetons</Text>

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
