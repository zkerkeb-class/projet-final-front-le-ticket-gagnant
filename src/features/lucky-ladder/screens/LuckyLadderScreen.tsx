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

type LadderStatus = "ACTIVE" | "LOST" | "CASHED_OUT" | "WON";

type LadderApiState = {
  sessionId: string;
  status: LadderStatus;
  betAmount: number;
  totalSteps: number;
  currentStep: number;
  brokenStep: number | null;
  currentMultiplier: number;
  nextBreakChance: number | null;
  nextMultiplier: number | null;
  potentialPayout: number;
  chipBalance: number;
  availableActions: {
    climb: boolean;
    cashout: boolean;
  };
  history: number[];
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const FALLBACK_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";
const LADDER_BOARD_HEIGHT = 188;
const STEP_NODE_HEIGHT = 12;
const PLAYER_WIDTH = 26;
const PLAYER_HEIGHT = 42;

const parsePositive = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
};

const getApiBaseUrls = (): string[] => {
  if (API_BASE_URL) {
    return [API_BASE_URL.replace(/\/games\/blackjack\/?$/, "/games/lucky-ladder")];
  }

  if (Platform.OS === "android") {
    return [
      "http://10.0.2.2:3000/api/games/lucky-ladder",
      "http://localhost:3000/api/games/lucky-ladder",
      "http://127.0.0.1:3000/api/games/lucky-ladder",
    ];
  }

  return [
    "http://localhost:3000/api/games/lucky-ladder",
    "http://127.0.0.1:3000/api/games/lucky-ladder",
  ];
};

const statusLabel: Record<Exclude<LadderStatus, "ACTIVE">, string> = {
  WON: "Sommet atteint ! Jackpot ✅",
  CASHED_OUT: "Encaissement réussi 💰",
  LOST: "Aïe… la marche a cassé 💥",
};

const getStatusLabel = (status: LadderStatus): string => {
  if (status === "ACTIVE") {
    return "Partie en cours";
  }

  return statusLabel[status];
};

export default function LuckyLadderScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const resolvedUserId = routeUserId ?? FALLBACK_USER_ID;
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [betInput, setBetInput] = useState("20");
  const [gameState, setGameState] = useState<LadderApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [boardLayout, setBoardLayout] = useState({ width: 620, height: LADDER_BOARD_HEIGHT });

  const playerXAnim = useRef(new Animated.Value(12)).current;
  const playerYAnim = useRef(new Animated.Value(150)).current;
  const fallAnim = useRef(new Animated.Value(0)).current;

  const isActiveSession = gameState?.status === "ACTIVE";
  const totalSteps = gameState?.totalSteps ?? 10;
  const currentStep = gameState?.currentStep ?? 0;

  const ladderBoardWidth = useMemo(() => {
    const availableWidth = isWide ? width - 470 : width - 56;
    return Math.max(260, Math.min(620, availableWidth));
  }, [isWide, width]);

  const canStart = useMemo(() => {
    const bet = parsePositive(betInput);
    return Number.isFinite(bet) && !loading;
  }, [betInput, loading]);

  const stepNodes = useMemo(
    () => Array.from({ length: totalSteps }, (_, index) => {
      const stepNumber = index + 1;
      const t = stepNumber / totalSteps;
      return {
        stepNumber,
        left: 9 + t * 82,
        top: 86 - Math.pow(t, 1.18) * 72,
      };
    }),
    [totalSteps],
  );

  const stepPixelPositions = useMemo(
    () => stepNodes.map((step) => {
      const centerX = (step.left / 100) * boardLayout.width;
      const centerY = (step.top / 100) * boardLayout.height;

      return {
        x: centerX - PLAYER_WIDTH / 2,
        y: centerY - STEP_NODE_HEIGHT / 2 - PLAYER_HEIGHT + 2,
      };
    }),
    [boardLayout.height, boardLayout.width, stepNodes],
  );

  const initialPlayerPosition = useMemo(() => {
    const firstStep = stepPixelPositions[0];
    if (!firstStep) {
      return { x: 12, y: 150 };
    }

    return {
      x: Math.max(8, firstStep.x - 72),
      y: Math.min(boardLayout.height - PLAYER_HEIGHT - 2, firstStep.y + 26),
    };
  }, [boardLayout.height, stepPixelPositions]);

  const apiCall = async (
    path: "/start" | "/state" | "/climb" | "/cashout",
    payload?: Record<string, unknown>,
  ) => {
    const baseUrls = getApiBaseUrls();
    let lastError: Error | null = null;

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload ?? {}),
        });

        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(data?.message ?? `Erreur API Lucky Ladder (${response.status})`);
        }

        return data as LadderApiState;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Erreur réseau inconnue.");
      }
    }

    throw new Error(lastError?.message ?? "Impossible de contacter l'API Lucky Ladder.");
  };

  useEffect(() => {
    const targetStep = gameState?.status === "LOST"
      ? (gameState.brokenStep ?? currentStep)
      : currentStep;

    const target = targetStep <= 0
      ? initialPlayerPosition
      : (stepPixelPositions[targetStep - 1] ?? initialPlayerPosition);

    const moveAnimation = Animated.parallel([
      Animated.timing(playerXAnim, {
        toValue: target.x,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(playerYAnim, {
        toValue: target.y,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    moveAnimation.start(() => {
      if (gameState?.status === "LOST") {
        Animated.timing(fallAnim, {
          toValue: 1,
          duration: 460,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start();
      }
    });

    if (gameState?.status !== "LOST") {
      fallAnim.setValue(0);
    }
  }, [currentStep, fallAnim, gameState?.brokenStep, gameState?.status, initialPlayerPosition, playerXAnim, playerYAnim, stepPixelPositions]);

  const handleStart = async () => {
    const bet = parsePositive(betInput);

    if (!Number.isFinite(bet)) {
      const message = "Mise invalide.";
      setErrorMessage(message);
      Alert.alert("Paramètres invalides", message);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const state = await apiCall("/start", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        betAmount: bet,
      });

      setGameState(state);
      playerXAnim.setValue(initialPlayerPosition.x);
      playerYAnim.setValue(initialPlayerPosition.y);
      fallAnim.setValue(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de démarrer Lucky Ladder.";
      setErrorMessage(message);
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleClimb = async () => {
    if (!gameState?.sessionId || !isActiveSession || loading) {
      return;
    }

    try {
      setLoading(true);
      const state = await apiCall("/climb", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(state);

      if (state.status !== "ACTIVE") {
        setTimeout(() => {
          Alert.alert("Résultat", getStatusLabel(state.status));
        }, state.status === "LOST" ? 760 : 380);
      }
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Impossible de grimper.");
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!gameState?.sessionId || !isActiveSession || loading) {
      return;
    }

    try {
      setLoading(true);
      const state = await apiCall("/cashout", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(state);
      Alert.alert("Résultat", getStatusLabel(state.status));
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Cashout impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = () => {
    setGameState(null);
    setErrorMessage(null);
    playerXAnim.setValue(initialPlayerPosition.x);
    playerYAnim.setValue(initialPlayerPosition.y);
    fallAnim.setValue(0);
  };

  const history = gameState?.history ?? [];
  const nextBreakPercent = gameState?.nextBreakChance ? Math.round(gameState.nextBreakChance * 100) : null;

  const fallTranslateY = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 145],
  });
  const fallRotate = fallAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "95deg"],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
            <View style={styles.betPanel}>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>Lucky Ladder</Text>
                <Text style={styles.panelMeta}>Sommet x∞</Text>
              </View>

              <Text style={styles.inputLabel}>Mise</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputPrefix}>€</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={betInput}
                  onChangeText={setBetInput}
                  placeholder="20"
                  placeholderTextColor="#7f8899"
                />
              </View>
            </View>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            {!gameState ? (
              <Pressable
                style={[styles.ctaButton, (!canStart || loading) && styles.ctaButtonDisabled]}
                onPress={handleStart}
                disabled={!canStart || loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaButtonText}>Démarrer</Text>}
              </Pressable>
            ) : isActiveSession ? (
              <View style={styles.actionsStack}>
                <Pressable
                  style={[styles.climbButton, loading && styles.ctaButtonDisabled]}
                  onPress={handleClimb}
                  disabled={loading || !gameState.availableActions.climb}
                >
                  <Text style={styles.climbButtonText}>Monter une marche</Text>
                </Pressable>

                <Pressable
                  style={[styles.cashoutButton, loading && styles.ctaButtonDisabled]}
                  onPress={handleCashout}
                  disabled={loading || !gameState.availableActions.cashout}
                >
                  <Text style={styles.cashoutButtonText}>Encaisser</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.ctaButton} onPress={handleReplay}>
                <Text style={styles.ctaButtonText}>Rejouer</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.tableArea}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>LUCKY LADDER</Text>
              <ChipBalanceBadge userId={resolvedUserId} amount={gameState?.chipBalance} compact />
            </View>

            {!gameState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Prêt à grimper ?</Text>
                <Text style={styles.emptyText}>Montez marche par marche et encaissez avant qu'une marche casse.</Text>
              </View>
            ) : (
              <View style={styles.tableContent}>
                <View style={styles.infoBar}>
                  <View>
                    <Text style={styles.infoLabel}>Marche</Text>
                    <Text style={styles.infoValue}>{gameState.currentStep}/{gameState.totalSteps}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Risque suivant</Text>
                    <Text style={styles.infoValue}>{nextBreakPercent ? `${nextBreakPercent}%` : "--"}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Payout</Text>
                    <Text style={styles.infoValue}>{gameState.potentialPayout.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.ladderArea}>
                  <View
                    style={styles.ladderBoard}
                    onLayout={(event) => {
                      const { width: boardWidth, height: boardHeight } = event.nativeEvent.layout;
                      if (boardWidth > 0 && boardHeight > 0) {
                        setBoardLayout({ width: boardWidth, height: boardHeight });
                      }
                    }}
                  >
                    <View style={styles.ladderGlow} />

                    {stepNodes.map((step) => {
                      const isReached = gameState.currentStep >= step.stepNumber;
                      const isBroken = gameState.brokenStep === step.stepNumber;

                      return (
                        <View
                          key={`step-${step.stepNumber}`}
                          style={[
                            styles.stepNode,
                            {
                              left: `${step.left}%` as `${number}%`,
                              top: `${step.top}%` as `${number}%`,
                            },
                            isReached && styles.stepNodeReached,
                            isBroken && styles.stepNodeBroken,
                          ]}
                        />
                      );
                    })}

                    <Animated.View
                      style={[
                        styles.playerWrap,
                        {
                          transform: [
                            { translateX: playerXAnim },
                            { translateY: playerYAnim },
                            { translateY: fallTranslateY },
                            { rotate: fallRotate },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.playerHead} />
                      <View style={styles.playerBody} />
                      <View style={styles.playerLegLeft} />
                      <View style={styles.playerLegRight} />
                    </Animated.View>
                  </View>

                  <Text style={styles.statusText}>
                    {gameState.status === "ACTIVE"
                      ? "Continuez pour augmenter le gain, ou encaissez maintenant."
                      : getStatusLabel(gameState.status)}
                  </Text>
                </View>

                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Historique</Text>
                  <View style={styles.historyChips}>
                    {history.length === 0
                      ? <Text style={styles.historyEmpty}>--</Text>
                      : history.map((value, index) => (
                        <View
                          key={`h-${index}`}
                          style={[styles.historyChip, value > 0 ? styles.historyChipHigh : styles.historyChipLow]}
                        >
                          <Text style={styles.historyChipText}>{value > 0 ? `x${value.toFixed(2)}` : "💥"}</Text>
                        </View>
                      ))}
                  </View>
                </View>
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
  betPanel: {
    gap: 10,
  },
  panelHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  panelTitle: {
    color: "#f3f4f6",
    fontSize: 28,
    fontWeight: "700",
  },
  panelMeta: {
    color: "#8fa0b8",
    fontSize: 14,
    fontWeight: "600",
  },
  inputLabel: {
    color: "#c7d2e7",
    fontSize: 13,
    fontWeight: "700",
  },
  inputWrap: {
    backgroundColor: "#1b2434",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#263449",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 54,
    gap: 8,
  },
  inputPrefix: {
    color: "#cde0ff",
    fontSize: 18,
    fontWeight: "800",
  },
  textInput: {
    flex: 1,
    color: "#f4f6fa",
    fontSize: 22,
    fontWeight: "700",
    paddingVertical: 0,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  actionsStack: {
    gap: 10,
  },
  ctaButton: {
    height: 60,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7a17ff",
  },
  ctaButtonDisabled: {
    opacity: 0.45,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  climbButton: {
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    borderWidth: 1,
    borderColor: "#14b8a6",
  },
  climbButtonText: {
    color: "#ccfbf1",
    fontSize: 19,
    fontWeight: "900",
  },
  cashoutButton: {
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14532d",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  cashoutButtonText: {
    color: "#dcfce7",
    fontSize: 18,
    fontWeight: "800",
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
  ladderArea: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1d2d48",
    backgroundColor: "rgba(10, 19, 32, 0.86)",
    padding: 12,
    gap: 12,
    minHeight: 360,
  },
  ladderBoard: {
    width: "100%",
    height: 280,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a4268",
    backgroundColor: "rgba(8, 16, 30, 0.92)",
    overflow: "hidden",
  },
  ladderGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -120,
    right: -85,
    backgroundColor: "rgba(20, 184, 166, 0.18)",
  },
  stepNode: {
    position: "absolute",
    width: 58,
    height: STEP_NODE_HEIGHT,
    marginLeft: -28,
    marginTop: -6,
    borderRadius: 8,
    backgroundColor: "rgba(84, 106, 146, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(126, 159, 214, 0.38)",
  },
  stepNodeReached: {
    backgroundColor: "rgba(20, 184, 166, 0.3)",
    borderColor: "#2dd4bf",
  },
  stepNodeBroken: {
    backgroundColor: "rgba(127, 29, 29, 0.42)",
    borderColor: "#ef4444",
    transform: [{ rotate: "-8deg" }],
  },
  playerWrap: {
    position: "absolute",
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  },
  playerHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fde68a",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  playerBody: {
    width: 8,
    height: 18,
    borderRadius: 5,
    alignSelf: "center",
    marginTop: 2,
    backgroundColor: "#38bdf8",
  },
  playerLegLeft: {
    position: "absolute",
    bottom: 2,
    left: 8,
    width: 4,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    transform: [{ rotate: "16deg" }],
  },
  playerLegRight: {
    position: "absolute",
    bottom: 2,
    right: 8,
    width: 4,
    height: 12,
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    transform: [{ rotate: "-14deg" }],
  },
  statusText: {
    color: "#d7e5fc",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },
  historyRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a3d60",
    backgroundColor: "rgba(21, 30, 48, 0.85)",
    padding: 12,
    gap: 8,
  },
  historyLabel: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  historyChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  historyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  historyChipLow: {
    backgroundColor: "rgba(127, 29, 29, 0.35)",
    borderColor: "#ef4444",
  },
  historyChipHigh: {
    backgroundColor: "rgba(19, 78, 74, 0.35)",
    borderColor: "#14b8a6",
  },
  historyChipText: {
    color: "#e5edf9",
    fontSize: 12,
    fontWeight: "800",
  },
  historyEmpty: {
    color: "#9fb2d0",
    fontSize: 12,
    fontWeight: "700",
  },
});
