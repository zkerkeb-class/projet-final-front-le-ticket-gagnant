import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
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

import ChipBalanceBadge from "@/src/components/ChipBalanceBadge";
import Card from "../components/Card";
import useSequentialDeal from "../hooks/useSequentialDeal";

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
const RESULT_PANEL_DELAY_MS = 420;

const statusText: Record<Exclude<BlackjackStatus, "ACTIVE">, string> = {
  PLAYER_WON: "Vous avez gagné !",
  DEALER_WON: "Le croupier a gagné.",
  PUSH: "Égalité (Push).",
};

const calculateBlackjackScore = (hand: CardType[]): number => {
  let score = 0;
  let aces = 0;

  hand.forEach((card) => {
    if (card.value === "A") {
      aces += 1;
      score += 11;
      return;
    }

    if (["K", "Q", "J"].includes(card.value)) {
      score += 10;
      return;
    }

    score += Number(card.value);
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
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
  const [showResultPanel, setShowResultPanel] = useState(false);

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

  const { visibleDealerCount, visiblePlayerCounts, dealTick } = useSequentialDeal(
    gameState?.sessionId,
    gameState?.dealerHand ?? [],
    playerHands,
  );

  const totalVisiblePlayerCards = visiblePlayerCounts.reduce((sum, count) => sum + count, 0);
  const totalPlayerCards = playerHands.reduce((sum, hand) => sum + hand.length, 0);
  const totalVisibleCards = visibleDealerCount + totalVisiblePlayerCards;
  const totalCards = (gameState?.dealerHand.length ?? 0) + totalPlayerCards;
  const isDealing = Boolean(gameState) && totalVisibleCards < totalCards;
  const isDealerRevealing = Boolean(gameState) && !isActiveGame && visibleDealerCount < (gameState?.dealerHand.length ?? 0);
  const isPlayerTurn = isActiveGame && !isDealing;

  useEffect(() => {
    if (!gameState || isActiveGame || isDealing) {
      setShowResultPanel(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowResultPanel(true);
    }, RESULT_PANEL_DELAY_MS);

    return () => {
      clearTimeout(timeout);
    };
  }, [gameState, isActiveGame, isDealing]);

  const deckPulse = useRef(new Animated.Value(0)).current;
  const deckKick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isDealing) {
      deckPulse.stopAnimation();
      deckPulse.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(deckPulse, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(deckPulse, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [deckPulse, isDealing]);

  useEffect(() => {
    if (!isDealing || dealTick === 0) {
      return;
    }

    Animated.sequence([
      Animated.timing(deckKick, {
        toValue: 1,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(deckKick, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [dealTick, deckKick, isDealing]);

  const deckPulseStyle = {
    transform: [
      { translateY: -62 },
      {
        translateX: deckKick.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -7],
        }),
      },
      {
        rotate: deckKick.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "-4deg"],
        }),
      },
      {
        scale: deckPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.06],
        }),
      },
    ],
    opacity: deckPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0.9],
    }),
  };

  const visibleDealerScore = useMemo(() => {
    if (!gameState) {
      return null;
    }

    const visibleDealerHand = gameState.dealerHand.slice(0, visibleDealerCount);
    if (visibleDealerHand.length === 0) {
      return null;
    }

    return calculateBlackjackScore(visibleDealerHand);
  }, [gameState, visibleDealerCount]);

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
              {renderActionTile("Piocher", "↳", handleHit, isPlayerTurn && !loading && availableActions.hit, "#34d399")}
              {renderActionTile("Rester", "✋", handleStand, isPlayerTurn && !loading && availableActions.stand, "#f87171")}
              {renderActionTile("Splitter", "↱", handleSplit, isPlayerTurn && !loading && availableActions.split, "#60a5fa")}
              {renderActionTile("Doubler", "⧉", handleDouble, isPlayerTurn && !loading && availableActions.double, "#facc15")}
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
                <Text style={styles.inGameText}>{isDealing ? "Distribution en cours..." : "Partie en cours"}</Text>
              </View>
            )}
          </View>

          <View style={styles.tableArea}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>BLACKJACK</Text>
              <View style={styles.tableHeaderRight}>
                <ChipBalanceBadge userId={resolvedUserId} amount={gameState?.chipBalance} compact />
                {gameState?.mode === "LOCAL_FALLBACK" ? <Text style={styles.localModeChip}>Mode local</Text> : null}
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
                    <Text style={styles.infoLabel}>Mise totale</Text>
                    <Text style={styles.infoValue}>{gameState.betAmount.toFixed(2)} jetons</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Pioche</Text>
                    <Text style={styles.infoValue}>{gameState.remainingCards} cartes</Text>
                  </View>
                </View>

                <View style={styles.phaseBanner}>
                  <Text style={styles.phaseBannerText}>
                    {isDealing
                      ? "Le croupier distribue les cartes..."
                      : (isActiveGame ? "À vous de jouer" : (isDealerRevealing ? "Tour du croupier" : "Main terminée"))}
                  </Text>
                </View>

                <View style={styles.playMat}>
                  <Animated.View style={[styles.virtualDeckWrap, deckPulseStyle]}>
                    <View style={styles.virtualDeckShadowA} />
                    <View style={styles.virtualDeckShadowB} />
                    <View style={styles.virtualDeckTop}>
                      <Text style={styles.virtualDeckTopText}>PAQUET</Text>
                    </View>
                    <Text style={styles.deckCountText}>{gameState.remainingCards}</Text>
                  </Animated.View>

                  <View style={[styles.dealerZone, isDealerRevealing ? styles.dealerZoneFocus : null]}>
                    <Text style={styles.sectionTitle}>Croupier</Text>
                    {!!isDealerRevealing && <Text style={styles.turnTag}>Tire...</Text>}
                    <View style={styles.centeredCardsRow}>
                      {gameState.dealerHand.slice(0, visibleDealerCount).map((card, index) => (
                        <View
                          key={`${card.suit}-${card.value}-${index}`}
                          style={[
                            styles.stackedCard,
                            styles.dealerCard,
                            index === 0 ? styles.firstStackedCard : null,
                            {
                              zIndex: index + 1,
                              transform: [{ rotate: `${-6 + index * 3}deg` }],
                            },
                          ]}
                        >
                          <Card value={card.value} suit={card.suit} entryLane="dealer" />
                        </View>
                      ))}
                    </View>
                    <Text style={styles.scoreText}>Score: {visibleDealerScore ?? "?"}</Text>
                  </View>

                  <View style={[styles.playerZone, isPlayerTurn ? styles.playerZoneFocus : null]}>
                    <Text style={styles.sectionTitle}>Joueur</Text>
                    {isPlayerTurn ? <Text style={styles.turnTag}>Votre tour</Text> : null}
                    <View style={styles.handsStackCentered}>
                    {playerHands.map((hand, handIndex) => (
                      <View
                        key={`hand-${handIndex}`}
                        style={[styles.playerHandCard, handIndex === activeHandIndex && isActiveGame ? styles.playerHandActive : null]}
                      >
                        <View style={styles.playerHandHeader}>
                          <Text style={styles.playerHandTitle}>Main {handIndex + 1}</Text>
                          <View style={styles.handBadgesRow}>
                            {handIndex === activeHandIndex && isActiveGame ? <Text style={styles.activeTag}>ACTIVE</Text> : null}
                            {(playerScores[handIndex] ?? 0) === 21 ? <Text style={styles.blackjackTag}>BLACKJACK</Text> : null}
                            {(playerScores[handIndex] ?? 0) > 21 ? <Text style={styles.bustTag}>BUST</Text> : null}
                          </View>
                        </View>
                        <View style={styles.centeredCardsRow}>
                          {hand.slice(0, visiblePlayerCounts[handIndex] ?? 0).map((card, cardIndex) => (
                            <View
                              key={`${card.suit}-${card.value}-${handIndex}-${cardIndex}`}
                              style={[
                                styles.stackedCard,
                                styles.playerCard,
                                cardIndex === 0 ? styles.firstStackedCard : null,
                                {
                                  zIndex: cardIndex + 1,
                                  transform: [{ rotate: `${6 - cardIndex * 3}deg` }],
                                },
                              ]}
                            >
                              <Card value={card.value} suit={card.suit} entryLane="player" />
                            </View>
                          ))}
                        </View>
                        <Text style={styles.scoreText}>Score: {playerScores[handIndex] ?? 0}</Text>
                      </View>
                    ))}
                    </View>
                  </View>
                </View>

                {showResultPanel && (
                  <View style={styles.resultPanel}>
                    <Text style={styles.resultTitle}>{statusText[gameState.status as Exclude<BlackjackStatus, "ACTIVE">]}</Text>
                    <Text style={[styles.resultText, gameState.outcome > 0 ? styles.resultWin : gameState.outcome < 0 ? styles.resultLoss : null]}>
                      Gain net: {gameState.outcome.toFixed(2)} jetons
                    </Text>
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
  tableHeaderRight: {
    alignItems: "flex-end",
    gap: 6,
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
    gap: 12,
  },
  phaseBanner: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#26395b",
    backgroundColor: "rgba(18, 29, 46, 0.78)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  phaseBannerText: {
    color: "#dbe5f5",
    fontSize: 14,
    fontWeight: "700",
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
  playMat: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1d2d48",
    backgroundColor: "rgba(10, 19, 32, 0.86)",
    minHeight: 420,
    paddingHorizontal: 22,
    paddingVertical: 18,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  virtualDeckWrap: {
    position: "absolute",
    right: 24,
    top: "50%",
    width: 82,
    height: 126,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  virtualDeckShadowA: {
    position: "absolute",
    width: 68,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a4c6e",
    backgroundColor: "#111a2a",
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },
  virtualDeckShadowB: {
    position: "absolute",
    width: 68,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#3a4c6e",
    backgroundColor: "#111a2a",
    transform: [{ translateX: -3 }, { translateY: -3 }],
  },
  virtualDeckTop: {
    width: 68,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#48638d",
    backgroundColor: "#15243a",
    alignItems: "center",
    justifyContent: "center",
  },
  virtualDeckTopText: {
    color: "#d7e3ff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  deckCountText: {
    marginTop: 6,
    color: "#99accd",
    fontSize: 12,
    fontWeight: "800",
  },
  dealerZone: {
    alignItems: "center",
    paddingTop: 6,
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  playerZone: {
    alignItems: "center",
    paddingBottom: 2,
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dealerZoneFocus: {
    borderWidth: 1,
    borderColor: "rgba(126, 176, 255, 0.45)",
    backgroundColor: "transparent",
  },
  playerZoneFocus: {
    borderWidth: 1,
    borderColor: "rgba(126, 176, 255, 0.45)",
    backgroundColor: "transparent",
  },
  sectionTitle: {
    color: "#f1f5f9",
    fontSize: 18,
    fontWeight: "800",
  },
  turnTag: {
    color: "#9ec8ff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  centeredCardsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 112,
  },
  stackedCard: {
    marginLeft: -46,
  },
  firstStackedCard: {
    marginLeft: 0,
  },
  dealerCard: {
    marginTop: 8,
  },
  playerCard: {
    marginTop: -8,
  },
  scoreText: {
    color: "#c8d2e4",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  handsStackCentered: {
    gap: 10,
    alignItems: "center",
    width: "100%",
  },
  playerHandCard: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    padding: 0,
    gap: 8,
    minWidth: 260,
    alignItems: "center",
  },
  playerHandActive: {
    borderColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },
  playerHandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  handBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playerHandTitle: {
    color: "#f4f7fb",
    fontSize: 16,
    fontWeight: "800",
  },
  activeTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#dbeafe",
    backgroundColor: "#1e3a5f",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  blackjackTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#052e16",
    backgroundColor: "#86efac",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  bustTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#450a0a",
    backgroundColor: "#fca5a5",
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
  resultWin: {
    color: "#86efac",
  },
  resultLoss: {
    color: "#fca5a5",
  },
});
