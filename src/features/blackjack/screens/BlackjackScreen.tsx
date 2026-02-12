import { useLocalSearchParams } from "expo-router";
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
    useWindowDimensions,
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
const FALLBACK_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";
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
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const resolvedUserId = routeUserId ?? FALLBACK_USER_ID;

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

    throw new Error(`${lastError?.message ?? "Impossible de contacter l'API."} URL(s) testée(s): ${baseUrls.join(", ")}`);
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
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
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
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
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
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
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

  const handleSplit = async () => {
    if (!gameState?.sessionId) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/split", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
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
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
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

  const handleReplay = () => {
    setGameState(null);
    setErrorMessage(null);
  };

  const quickHalfBet = () => {
    const amount = parseBetAmount(betInput);
    if (!Number.isFinite(amount)) {
      return;
    }

    setBetInput(Math.max(1, amount / 2).toFixed(2).replace(".", ","));
  };

  const quickDoubleBet = () => {
    const amount = parseBetAmount(betInput);
    if (!Number.isFinite(amount)) {
      return;
    }

    setBetInput((amount * 2).toFixed(2).replace(".", ","));
  };

  const playerHands = gameState?.playerHands ?? (gameState ? [gameState.playerHand] : []);
  const playerScores = gameState?.playerScores ?? (gameState ? [gameState.playerScore] : []);
  const activeHandIndex = typeof gameState?.activeHandIndex === "number" ? gameState.activeHandIndex : 0;

  const availableActions = gameState?.availableActions ?? {
    hit: Boolean(isActiveGame),
    stand: Boolean(isActiveGame),
    split: false,
    double: false,
  };

  const renderActionTile = (
    label: string,
    icon: string,
    onPress: () => void,
    enabled: boolean,
    accentColor: string,
  ) => (
    <Pressable
      style={[styles.actionTile, !enabled && styles.actionTileDisabled]}
      onPress={onPress}
      disabled={!enabled}
    >
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={[styles.actionIcon, { color: accentColor }]}>{icon}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
            <View style={styles.segmentedControl}>
              <View style={[styles.segmentItem, styles.segmentActive]}>
                <Text style={[styles.segmentText, styles.segmentTextActive]}>Standard</Text>
              </View>
              <View style={styles.segmentItem}>
                <Text style={styles.segmentText}>Mise secondaire</Text>
              </View>
            </View>

            <View style={styles.betPanel}>
              <View style={styles.betHeaderRow}>
                <Text style={styles.betTitle}>Montant du pari</Text>
                <Text style={styles.betMeta}>0,00000000 SOL</Text>
              </View>

              <View style={styles.betInputWrap}>
                <View style={styles.euroBadge}>
                  <Text style={styles.euroBadgeText}>€</Text>
                </View>

                <TextInput
                  style={styles.betInput}
                  keyboardType="numeric"
                  value={betInput}
                  onChangeText={(value) => {
                    setBetInput(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="0,00"
                  placeholderTextColor="#7f8899"
                />

                <Pressable style={styles.quickButton} onPress={quickHalfBet}>
                  <Text style={styles.quickButtonText}>½</Text>
                </Pressable>
                <Pressable style={styles.quickButton} onPress={quickDoubleBet}>
                  <Text style={styles.quickButtonText}>2x</Text>
                </Pressable>
              </View>
            </View>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <View style={styles.actionsGrid}>
              {renderActionTile("Piocher", "↳", handleHit, isActiveGame && !loading && availableActions.hit, "#34d399")}
              {renderActionTile("Rester", "✋", handleStand, isActiveGame && !loading && availableActions.stand, "#f87171")}
              {renderActionTile("Spliter", "↱", handleSplit, isActiveGame && !loading && availableActions.split, "#60a5fa")}
              {renderActionTile("Doubler", "⧉", handleDouble, isActiveGame && !loading && availableActions.double, "#facc15")}
            </View>

            {!gameState ? (
              <Pressable style={[styles.ctaButton, !canStart && styles.ctaButtonDisabled]} onPress={handleStart} disabled={!canStart}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaButtonText}>Pari</Text>}
              </Pressable>
            ) : !isActiveGame ? (
              <Pressable style={styles.ctaButton} onPress={handleReplay}>
                <Text style={styles.ctaButtonText}>Rejouer</Text>
              </Pressable>
            ) : (
              <View style={styles.inGamePill}>
                <Text style={styles.inGameText}>Partie en cours</Text>
              </View>
            )}
          </View>

          <View style={styles.tableArea}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>BLACKJACK</Text>
              {gameState?.mode === "LOCAL_FALLBACK" ? <Text style={styles.localModeChip}>Mode local</Text> : null}
            </View>

            <View style={styles.rulesStack}>
              <View style={styles.ruleBadge}>
                <Text style={styles.ruleText}>BLACKJACK PAYS 3 TO 2</Text>
              </View>
              <View style={styles.ruleBadge}>
                <Text style={styles.ruleText}>INSURANCE PAYS 2 TO 1</Text>
              </View>
            </View>

            {!gameState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Table prête</Text>
                <Text style={styles.emptyText}>Entrez votre mise et cliquez sur Pari pour démarrer.</Text>
              </View>
            ) : (
              <View style={styles.tableContent}>
                <View style={styles.infoBar}>
                  <View>
                    <Text style={styles.infoLabel}>Solde</Text>
                    <Text style={styles.infoValue}>{gameState.chipBalance.toFixed(2)} jetons</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Mise totale</Text>
                    <Text style={styles.infoValue}>{gameState.betAmount.toFixed(2)} jetons</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Pioche</Text>
                    <Text style={styles.infoValue}>{gameState.remainingCards} cartes</Text>
                  </View>
                </View>

                <View style={styles.handSection}>
                  <Text style={styles.sectionTitle}>Croupier</Text>
                  <View style={styles.cardsRow}>
                    {gameState.dealerHand.map((card, index) => (
                      <Card key={`${card.suit}-${card.value}-${index}`} value={card.value} suit={card.suit} />
                    ))}
                  </View>
                  <Text style={styles.scoreText}>Score: {gameState.dealerScore ?? "?"}</Text>
                </View>

                <View style={styles.handSection}>
                  <Text style={styles.sectionTitle}>Joueur</Text>
                  <View style={styles.handsStack}>
                    {playerHands.map((hand, handIndex) => (
                      <View
                        key={`hand-${handIndex}`}
                        style={[styles.playerHandCard, handIndex === activeHandIndex && isActiveGame ? styles.playerHandActive : null]}
                      >
                        <View style={styles.playerHandHeader}>
                          <Text style={styles.playerHandTitle}>Main {handIndex + 1}</Text>
                          {handIndex === activeHandIndex && isActiveGame ? <Text style={styles.activeTag}>ACTIVE</Text> : null}
                        </View>
                        <View style={styles.cardsRow}>
                          {hand.map((card, cardIndex) => (
                            <Card key={`${card.suit}-${card.value}-${handIndex}-${cardIndex}`} value={card.value} suit={card.suit} />
                          ))}
                        </View>
                        <Text style={styles.scoreText}>Score: {playerScores[handIndex] ?? 0}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {!isActiveGame && (
                  <View style={styles.resultPanel}>
                    <Text style={styles.resultTitle}>{statusText[gameState.status as Exclude<BlackjackStatus, "ACTIVE">]}</Text>
                    <Text style={styles.resultText}>Gain net: {gameState.outcome.toFixed(2)} jetons</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#090f1b",
  },
  page: {
    flexGrow: 1,
    padding: 14,
  },
  layout: {
    flexDirection: "column",
    gap: 14,
  },
  layoutWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  sidebar: {
    backgroundColor: "#0f1727",
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#1c2738",
  },
  sidebarWide: {
    width: 360,
  },
  segmentedControl: {
    backgroundColor: "#171f2e",
    borderRadius: 10,
    padding: 6,
    flexDirection: "row",
    gap: 6,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#363f50",
  },
  segmentText: {
    color: "#a7b1c2",
    fontSize: 16,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#f3f4f6",
  },
  betPanel: {
    gap: 10,
  },
  betHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  betTitle: {
    color: "#f3f4f6",
    fontSize: 28,
    fontWeight: "700",
  },
  betMeta: {
    color: "#8fa0b8",
    fontSize: 14,
    fontWeight: "600",
  },
  betInputWrap: {
    backgroundColor: "#1b2434",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#263449",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 62,
    gap: 8,
  },
  euroBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1590d7",
    alignItems: "center",
    justifyContent: "center",
  },
  euroBadgeText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  betInput: {
    flex: 1,
    color: "#f4f6fa",
    fontSize: 32,
    fontWeight: "700",
    paddingVertical: 0,
  },
  quickButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#2a3448",
    alignItems: "center",
    justifyContent: "center",
  },
  quickButtonText: {
    color: "#d6dbe5",
    fontSize: 20,
    fontWeight: "700",
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionTile: {
    width: "48%",
    minHeight: 74,
    borderRadius: 10,
    backgroundColor: "#161f2f",
    borderWidth: 1,
    borderColor: "#202d43",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionTileDisabled: {
    opacity: 0.42,
  },
  actionLabel: {
    color: "#e5e7eb",
    fontSize: 17,
    fontWeight: "600",
  },
  actionIcon: {
    fontSize: 24,
    fontWeight: "900",
  },
  ctaButton: {
    height: 68,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7a17ff",
    shadowColor: "#7a17ff",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
  },
  inGamePill: {
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16253f",
    borderWidth: 1,
    borderColor: "#2c3f63",
    alignItems: "center",
    justifyContent: "center",
  },
  inGameText: {
    color: "#d3e0ff",
    fontSize: 16,
    fontWeight: "700",
  },
  tableArea: {
    flex: 1,
    backgroundColor: "#070d18",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#182338",
    padding: 18,
    minHeight: 560,
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  tableTitle: {
    color: "#f2f5fa",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
  },
  localModeChip: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "800",
    backgroundColor: "#fde68a",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  rulesStack: {
    alignSelf: "center",
    gap: 8,
    marginBottom: 24,
  },
  ruleBadge: {
    backgroundColor: "#1a2232",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: "#2c374d",
  },
  ruleText: {
    color: "#838ea5",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  emptyState: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e2b42",
    backgroundColor: "rgba(16, 23, 38, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    color: "#f3f4f6",
    fontSize: 24,
    fontWeight: "800",
  },
  emptyText: {
    color: "#9ea7bb",
    fontSize: 16,
    textAlign: "center",
    maxWidth: 520,
  },
  tableContent: {
    gap: 14,
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1f2f4d",
    backgroundColor: "rgba(17, 26, 42, 0.78)",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  infoLabel: {
    color: "#89a0c6",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#f3f4f6",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  handSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1d2d48",
    backgroundColor: "rgba(13, 21, 34, 0.75)",
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "800",
  },
  cardsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  scoreText: {
    color: "#c8d2e4",
    fontSize: 15,
    fontWeight: "700",
  },
  handsStack: {
    gap: 10,
  },
  playerHandCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3c5f",
    backgroundColor: "rgba(17, 27, 44, 0.65)",
    padding: 10,
    gap: 8,
  },
  playerHandActive: {
    borderColor: "#4da2ff",
    shadowColor: "#4da2ff",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  playerHandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerHandTitle: {
    color: "#f4f7fb",
    fontSize: 16,
    fontWeight: "800",
  },
  activeTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    backgroundColor: "#67e8f9",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  resultPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a3d60",
    backgroundColor: "rgba(21, 30, 48, 0.85)",
    padding: 14,
    gap: 8,
  },
  resultTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
  },
  resultText: {
    color: "#c6d0e3",
    fontSize: 16,
    fontWeight: "700",
  },
});
