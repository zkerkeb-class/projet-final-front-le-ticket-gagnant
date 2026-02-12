import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import Card from "../components/Card";

type CardType = {
  value: "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
  suit: "H" | "D" | "C" | "S";
};

type BlackjackStatus = "ACTIVE" | "PLAYER_WON" | "DEALER_WON" | "PUSH";

type BlackjackApiState = {
  sessionId: string;
  status: BlackjackStatus;
  betAmount: number;
  outcome: number;
  chipBalance: number;
  playerHand: CardType[];
  playerHands?: CardType[][];
  playerScores?: number[];
  activeHandIndex?: number;
  dealerHand: CardType[];
  playerScore: number;
  dealerScore: number | null;
  remainingCards: number;
  availableActions?: {
    hit: boolean;
    stand: boolean;
    split: boolean;
    double: boolean;
  };
  mode?: "LOCAL_FALLBACK";
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const DEMO_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";
const REQUEST_TIMEOUT_MS = 10000;

const statusText: Record<Exclude<BlackjackStatus, "ACTIVE">, string> = {
  PLAYER_WON: "Vous avez gagné !",
  DEALER_WON: "Le croupier a gagné.",
  PUSH: "Égalité (Push).",
};

const parseBetAmount = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
};

const getApiBaseUrls = (): string[] => {
  if (API_BASE_URL) {
    return [API_BASE_URL];
  }

  if (Platform.OS === "android") {
    return [
      "http://10.0.2.2:3000/api/games/blackjack",
      "http://localhost:3000/api/games/blackjack",
      "http://127.0.0.1:3000/api/games/blackjack",
    ];
  }

  return [
    "http://localhost:3000/api/games/blackjack",
    "http://127.0.0.1:3000/api/games/blackjack",
  ];
};

export default function BlackjackScreen() {
  const [betInput, setBetInput] = useState("50");
  const [gameState, setGameState] = useState<BlackjackApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isActiveGame = gameState?.status === "ACTIVE";

  const canStart = useMemo(() => {
    const amount = parseBetAmount(betInput);
    return Number.isFinite(amount) && amount > 0 && !loading;
  }, [betInput, loading]);

  const apiCall = async (path: "/start" | "/hit" | "/stand" | "/split" | "/double", payload: Record<string, unknown>) => {
    const baseUrls = getApiBaseUrls();
    let lastError: Error | null = null;

    for (const baseUrl of baseUrls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(data?.message ?? `Erreur API Blackjack (${response.status})`);
        }

        return data as BlackjackApiState;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Erreur réseau inconnue.");
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `${lastError?.message ?? "Impossible de contacter l'API."} URL(s) testée(s): ${baseUrls.join(", ")}`,
    );
  };

  const handleStart = async () => {
    const betAmount = parseBetAmount(betInput);
    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      const message = "Entrez un montant valide supérieur à 0 (ex: 50 ou 50,5).";
      setErrorMessage(message);
      Alert.alert("Mise invalide", message);
      return;
    }

    try {
      setErrorMessage(null);
      setLoading(true);
      const nextState = await apiCall("/start", {
        ...(DEMO_USER_ID ? { userId: DEMO_USER_ID } : {}),
        betAmount,
      });
      setGameState(nextState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de démarrer la partie.";
      setErrorMessage(message);
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleHit = async () => {
    if (!gameState?.sessionId) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/hit", {
        ...(DEMO_USER_ID ? { userId: DEMO_USER_ID } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(nextState);

      if (nextState.status !== "ACTIVE") {
        Alert.alert("Résultat", statusText[nextState.status as Exclude<BlackjackStatus, "ACTIVE">]);
      }
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleSplit = async () => {
    if (!gameState?.sessionId) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/split", {
        ...(DEMO_USER_ID ? { userId: DEMO_USER_ID } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(nextState);

      if (nextState.status !== "ACTIVE") {
        Alert.alert("Résultat", statusText[nextState.status as Exclude<BlackjackStatus, "ACTIVE">]);
      }
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleDouble = async () => {
    if (!gameState?.sessionId) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/double", {
        ...(DEMO_USER_ID ? { userId: DEMO_USER_ID } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(nextState);

      if (nextState.status !== "ACTIVE") {
        Alert.alert("Résultat", statusText[nextState.status as Exclude<BlackjackStatus, "ACTIVE">]);
      }
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleStand = async () => {
    if (!gameState?.sessionId) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/stand", {
        ...(DEMO_USER_ID ? { userId: DEMO_USER_ID } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(nextState);
      Alert.alert("Résultat", statusText[nextState.status as Exclude<BlackjackStatus, "ACTIVE">]);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Action impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = () => {
    setGameState(null);
    setErrorMessage(null);
  };

  const playerHands = gameState?.playerHands ?? (gameState ? [gameState.playerHand] : []);
  const playerScores = gameState?.playerScores ?? (gameState ? [gameState.playerScore] : []);
  const activeHandIndex = typeof gameState?.activeHandIndex === "number" ? gameState.activeHandIndex : 0;

  const availableActions = gameState?.availableActions ?? {
    hit: isActiveGame,
    stand: isActiveGame,
    split: false,
    double: false,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>🃏 Blackjack</Text>
          <Text style={styles.subtitle}>Table Premium</Text>
        </View>

        {!gameState && (
          <View style={styles.betBox}>
            <Text style={styles.sectionTitle}>Commencer une partie</Text>
            <Text style={styles.hintText}>Choisissez votre mise puis lancez la donne.</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={betInput}
              onChangeText={(value) => {
                setBetInput(value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              placeholder="Montant"
              placeholderTextColor="#999"
            />

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <Pressable style={[styles.primaryButton, !canStart && styles.disabledButton]} onPress={handleStart} disabled={!canStart}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>JOUER</Text>}
            </Pressable>
          </View>
        )}

        {gameState && (
          <View style={styles.gameArea}>
            <View style={styles.infoRow}>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Solde</Text>
                <Text style={styles.infoValue}>{gameState.chipBalance.toFixed(2)} jetons</Text>
              </View>
              <View style={styles.infoPill}>
                <Text style={styles.infoLabel}>Mise totale</Text>
                <Text style={styles.infoValue}>{gameState.betAmount.toFixed(2)} jetons</Text>
              </View>
            </View>

            {gameState.mode === "LOCAL_FALLBACK" ? (
              <View style={styles.localModeBadge}>
                <Text style={styles.localModeText}>Mode local</Text>
              </View>
            ) : null}

            <View style={styles.zone}>
              <Text style={styles.sectionTitle}>Croupier</Text>
              <View style={styles.cardsRow}>
                {gameState.dealerHand.map((card, index) => (
                  <Card key={`${card.suit}-${card.value}-${index}`} value={card.value} suit={card.suit} />
                ))}
              </View>
              <Text style={styles.score}>Score: {gameState.dealerScore ?? "?"}</Text>
            </View>

            <View style={styles.zone}>
              <Text style={styles.sectionTitle}>Joueur</Text>
              <View style={styles.handsStack}>
                {playerHands.map((hand, handIndex) => (
                  <View key={`hand-${handIndex}`} style={[styles.handBox, handIndex === activeHandIndex && isActiveGame ? styles.activeHandBox : null]}>
                    <View style={styles.handHeaderRow}>
                      <Text style={styles.handTitle}>Main {handIndex + 1}</Text>
                      {handIndex === activeHandIndex && isActiveGame ? <Text style={styles.activeTag}>ACTIVE</Text> : null}
                    </View>
                    <View style={styles.cardsRow}>
                      {hand.map((card, cardIndex) => (
                        <Card key={`${card.suit}-${card.value}-${handIndex}-${cardIndex}`} value={card.value} suit={card.suit} />
                      ))}
                    </View>
                    <Text style={styles.score}>Score: {playerScores[handIndex] ?? 0}</Text>
                  </View>
                ))}
              </View>
            </View>

            {isActiveGame ? (
              <View style={styles.actionsWrap}>
                <Pressable style={[styles.actionButton, styles.hitButton, (loading || !availableActions.hit) && styles.disabledButton]} onPress={handleHit} disabled={loading || !availableActions.hit}>
                  <Text style={styles.actionButtonText}>Tirer</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.standButton, (loading || !availableActions.stand) && styles.disabledButton]} onPress={handleStand} disabled={loading || !availableActions.stand}>
                  <Text style={styles.actionButtonText}>Rester</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.splitButton, (loading || !availableActions.split) && styles.disabledButton]} onPress={handleSplit} disabled={loading || !availableActions.split}>
                  <Text style={styles.actionButtonText}>Split</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.doubleButton, (loading || !availableActions.double) && styles.disabledButton]} onPress={handleDouble} disabled={loading || !availableActions.double}>
                  <Text style={styles.actionButtonText}>Doubler</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.endBox}>
                <Text style={styles.resultTitle}>{statusText[gameState.status as Exclude<BlackjackStatus, "ACTIVE">]}</Text>
                <Text style={styles.resultText}>Gain net: {gameState.outcome.toFixed(2)} jetons</Text>
                <Pressable style={styles.primaryButton} onPress={handleReplay}>
                  <Text style={styles.primaryButtonText}>Rejouer</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0d3d2d",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 14,
  },
  headerCard: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#d0eadf",
    fontWeight: "600",
  },
  betBox: {
    backgroundColor: "#f6f8f7",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#dfe9e3",
  },
  hintText: {
    color: "#4f5e56",
    fontSize: 14,
    marginTop: -4,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d3d3d3",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  errorText: {
    color: "#b71c1c",
    fontSize: 14,
    fontWeight: "600",
  },
  gameArea: {
    gap: 12,
  },
  localModeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f6d365",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  localModeText: {
    color: "#4a3d1b",
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoPill: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  infoLabel: {
    color: "#cce5db",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  infoValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  zone: {
    backgroundColor: "#edf2ef",
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "#d8e3dd",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  handsStack: {
    gap: 10,
  },
  handBox: {
    backgroundColor: "#fcfcfc",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  activeHandBox: {
    borderColor: "#2f8de4",
    borderWidth: 2,
  },
  handHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  handTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  activeTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1f6fbe",
    backgroundColor: "#d8ecff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  score: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  actionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionButton: {
    minWidth: "47%",
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  hitButton: {
    backgroundColor: "#2e7d32",
  },
  standButton: {
    backgroundColor: "#37474f",
  },
  splitButton: {
    backgroundColor: "#00897b",
  },
  doubleButton: {
    backgroundColor: "#8e24aa",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryButton: {
    height: 50,
    borderRadius: 10,
    backgroundColor: "#1d7ee0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.38,
  },
  endBox: {
    backgroundColor: "#f3f7f5",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#d8e3dd",
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1d2f27",
  },
  resultText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34473f",
  },
});
