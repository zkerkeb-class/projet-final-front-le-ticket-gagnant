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

type MinesStatus = "ACTIVE" | "WON" | "LOST" | "CASHED_OUT";

type MinesApiState = {
  sessionId: string;
  status: MinesStatus;
  betAmount: number;
  minesCount: number;
  gridSize: number;
  revealedCells: number[];
  revealedMines: number[];
  explodedCell: number | null;
  safeRevealedCount: number;
  safeTotal: number;
  multiplier: number;
  potentialPayout: number;
  chipBalance: number;
  availableActions: {
    reveal: boolean;
    cashout: boolean;
  };
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const FALLBACK_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";

const parsePositiveNumber = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
};

const parseMinesCount = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return Number.NaN;
  }

  return parsed;
};

const getApiBaseUrls = (): string[] => {
  if (API_BASE_URL) {
    return [API_BASE_URL.replace(/\/games\/blackjack\/?$/, "/games/mines")];
  }

  if (Platform.OS === "android") {
    return [
      "http://10.0.2.2:3000/api/games/mines",
      "http://localhost:3000/api/games/mines",
      "http://127.0.0.1:3000/api/games/mines",
    ];
  }

  return [
    "http://localhost:3000/api/games/mines",
    "http://127.0.0.1:3000/api/games/mines",
  ];
};

const statusText: Record<Exclude<MinesStatus, "ACTIVE">, string> = {
  WON: "Jackpot! Toutes les cases sûres sont ouvertes.",
  LOST: "Boom 💣 vous avez touché une mine.",
  CASHED_OUT: "Encaissement réussi.",
};

export default function MinesScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const resolvedUserId = routeUserId ?? FALLBACK_USER_ID;
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const [betInput, setBetInput] = useState("20");
  const [minesInput, setMinesInput] = useState("5");
  const [gameState, setGameState] = useState<MinesApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isActiveGame = gameState?.status === "ACTIVE";

  const flipValuesRef = useRef(Array.from({ length: 25 }, () => new Animated.Value(0)));
  const previousSessionRef = useRef<string | undefined>(undefined);
  const previouslyRevealedRef = useRef<Set<number>>(new Set());

  const gridBoardSize = useMemo(() => {
    const availableWidth = isWide ? width - 460 : width - 56;
    return Math.max(250, Math.min(430, availableWidth));
  }, [isWide, width]);

  const cellGap = width < 430 ? 6 : 8;
  const cellSize = useMemo(
    () => Math.floor((gridBoardSize - 20 - cellGap * 4) / 5),
    [cellGap, gridBoardSize],
  );
  const cellIconSize = Math.max(22, Math.floor(cellSize * 0.58));

  const canStart = useMemo(() => {
    const betAmount = parsePositiveNumber(betInput);
    const minesCount = parseMinesCount(minesInput);

    return Number.isFinite(betAmount) && minesCount >= 1 && minesCount <= 24 && !loading;
  }, [betInput, minesInput, loading]);

  const apiCall = async (path: "/start" | "/reveal" | "/cashout", payload: Record<string, unknown>) => {
    const baseUrls = getApiBaseUrls();
    let lastError: Error | null = null;

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(data?.message ?? `Erreur API Mines (${response.status})`);
        }

        return data as MinesApiState;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Erreur réseau inconnue.");
      }
    }

    throw new Error(lastError?.message ?? "Impossible de contacter l'API Mines.");
  };

  const handleStart = async () => {
    const betAmount = parsePositiveNumber(betInput);
    const minesCount = parseMinesCount(minesInput);

    if (!Number.isFinite(betAmount) || minesCount < 1 || minesCount > 24) {
      const message = "Mise ou nombre de mines invalide (1-24).";
      setErrorMessage(message);
      Alert.alert("Paramètres invalides", message);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const nextState = await apiCall("/start", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        betAmount,
        minesCount,
      });
      setGameState(nextState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de démarrer Mines.";
      setErrorMessage(message);
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (cellIndex: number) => {
    if (!gameState?.sessionId || !isActiveGame || loading) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/reveal", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        sessionId: gameState.sessionId,
        cellIndex,
      });
      setGameState(nextState);

      if (nextState.status !== "ACTIVE") {
        Alert.alert("Résultat", statusText[nextState.status as Exclude<MinesStatus, "ACTIVE">]);
      }
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Révélation impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!gameState?.sessionId || !isActiveGame || loading) {
      return;
    }

    try {
      setLoading(true);
      const nextState = await apiCall("/cashout", {
        ...(resolvedUserId ? { userId: resolvedUserId } : {}),
        sessionId: gameState.sessionId,
      });
      setGameState(nextState);
      Alert.alert("Résultat", statusText[nextState.status as Exclude<MinesStatus, "ACTIVE">]);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Cashout impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = () => {
    setGameState(null);
    setErrorMessage(null);
  };

  const revealedCells = useMemo(() => new Set(gameState?.revealedCells ?? []), [gameState?.revealedCells]);
  const revealedMines = useMemo(() => new Set(gameState?.revealedMines ?? []), [gameState?.revealedMines]);

  useEffect(() => {
    if (!gameState?.sessionId) {
      previousSessionRef.current = undefined;
      previouslyRevealedRef.current = new Set();
      flipValuesRef.current.forEach((value) => value.setValue(0));
      return;
    }

    if (previousSessionRef.current !== gameState.sessionId) {
      previousSessionRef.current = gameState.sessionId;
      previouslyRevealedRef.current = new Set();
      flipValuesRef.current.forEach((value) => value.setValue(0));
    }

    const currentlyRevealed = gameState.status === "ACTIVE"
      ? new Set<number>([...gameState.revealedCells, ...gameState.revealedMines])
      : new Set<number>(Array.from({ length: gameState.gridSize }, (_, index) => index));
    const newlyRevealed = Array.from(currentlyRevealed).filter((index) => !previouslyRevealedRef.current.has(index));

    if (newlyRevealed.length > 0) {
      const animations = newlyRevealed.map((index) =>
        Animated.timing(flipValuesRef.current[index], {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      );

      Animated.stagger(45, animations).start();
    }

    previouslyRevealedRef.current = currentlyRevealed;
  }, [gameState?.sessionId, gameState?.revealedCells, gameState?.revealedMines, gameState?.status, gameState?.gridSize]);

  const gridItems = Array.from({ length: 25 }, (_, index) => index);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
            <View style={styles.betPanel}>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>Jeu des Mines</Text>
                <Text style={styles.panelMeta}>Risque / Reward</Text>
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

              <Text style={styles.inputLabel}>Nombre de mines (1-24)</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputPrefix}>💣</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={minesInput}
                  onChangeText={setMinesInput}
                  placeholder="5"
                  placeholderTextColor="#7f8899"
                />
              </View>
            </View>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <View style={styles.actionsStack}>
              {!gameState ? (
                <Pressable style={[styles.ctaButton, !canStart && styles.ctaButtonDisabled]} onPress={handleStart} disabled={!canStart}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaButtonText}>Démarrer</Text>}
                </Pressable>
              ) : isActiveGame ? (
                <>
                  <Pressable style={[styles.secondaryButton, loading && styles.ctaButtonDisabled]} onPress={handleCashout} disabled={loading || !gameState.availableActions.cashout}>
                    <Text style={styles.secondaryButtonText}>Encaisser</Text>
                  </Pressable>
                  <View style={styles.inGamePill}>
                    <Text style={styles.inGameText}>Partie en cours</Text>
                  </View>
                </>
              ) : (
                <Pressable style={styles.ctaButton} onPress={handleReplay}>
                  <Text style={styles.ctaButtonText}>Rejouer</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.tableArea}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>MINES</Text>
              <ChipBalanceBadge userId={resolvedUserId} amount={gameState?.chipBalance} compact />
            </View>

            {!gameState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Grille prête</Text>
                <Text style={styles.emptyText}>Choisissez votre mise et le nombre de mines puis démarrez la partie.</Text>
              </View>
            ) : (
              <View style={styles.tableContent}>
                <View style={styles.infoBar}>
                  <View>
                    <Text style={styles.infoLabel}>Mines</Text>
                    <Text style={styles.infoValue}>{gameState.minesCount}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Multiplicateur</Text>
                    <Text style={styles.infoValue}>x{gameState.multiplier.toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Gain potentiel</Text>
                    <Text style={styles.infoValue}>{gameState.potentialPayout.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={[styles.gridWrap, { width: gridBoardSize, gap: cellGap }]}>
                  {gridItems.map((cellIndex) => {
                    const isRoundFinished = gameState.status !== "ACTIVE";
                    const isRevealed = revealedCells.has(cellIndex);
                    const isMine = revealedMines.has(cellIndex);
                    const isExploded = gameState.explodedCell === cellIndex;
                    const shouldShowDiamond = !isMine && (isRevealed || isRoundFinished);
                    const flipValue = flipValuesRef.current[cellIndex];

                    const frontFaceStyle = {
                      transform: [
                        { perspective: 900 },
                        {
                          rotateY: flipValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "180deg"],
                          }),
                        },
                      ],
                    };

                    const backFaceStyle = {
                      transform: [
                        { perspective: 900 },
                        {
                          rotateY: flipValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["180deg", "360deg"],
                          }),
                        },
                      ],
                    };

                    return (
                      <Pressable
                        key={`cell-${cellIndex}`}
                        style={[styles.cellPressable, { width: cellSize, height: cellSize }]}
                        onPress={() => handleReveal(cellIndex)}
                        disabled={!isActiveGame || loading || isRevealed}
                      >
                        <Animated.View style={[styles.cellFace, styles.cellFront, frontFaceStyle]} />

                        <Animated.View
                          style={[
                            styles.cellFace,
                            styles.cellBack,
                            shouldShowDiamond ? styles.cellSafe : null,
                            isMine ? styles.cellMine : null,
                            isExploded ? styles.cellExploded : null,
                            backFaceStyle,
                          ]}
                        >
                          {isMine ? (
                            <Text style={[styles.cellText, styles.mineText, { fontSize: cellIconSize }]}>💣</Text>
                          ) : shouldShowDiamond ? (
                            <Text style={[styles.cellText, styles.diamondText, { fontSize: cellIconSize }]}>💎</Text>
                          ) : null}
                        </Animated.View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.progressText}>
                  Cases sûres: {gameState.safeRevealedCount}/{gameState.safeTotal}
                </Text>

                {gameState.status !== "ACTIVE" ? (
                  <View style={styles.resultPanel}>
                    <Text style={styles.resultTitle}>{statusText[gameState.status]}</Text>
                    <Text style={styles.resultText}>Payout: {gameState.potentialPayout.toFixed(2)} jetons</Text>
                  </View>
                ) : null}
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
  secondaryButton: {
    height: 54,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#134e4a",
    borderWidth: 1,
    borderColor: "#0f766e",
  },
  secondaryButtonText: {
    color: "#ccfbf1",
    fontSize: 18,
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
  gridWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1d2d48",
    backgroundColor: "rgba(10, 19, 32, 0.86)",
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignSelf: "center",
  },
  cellPressable: {
    position: "relative",
  },
  cellFace: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#31486b",
    backgroundColor: "#132035",
    alignItems: "center",
    justifyContent: "center",
    backfaceVisibility: "hidden",
  },
  cellFront: {
    backgroundColor: "#132035",
  },
  cellBack: {
    backgroundColor: "#153450",
  },
  cellSafe: {
    backgroundColor: "#153450",
    borderColor: "#3f89b8",
  },
  cellMine: {
    backgroundColor: "#4b1d2f",
    borderColor: "#ef4444",
  },
  cellExploded: {
    backgroundColor: "#7f1d1d",
  },
  cellText: {
    textAlign: "center",
    includeFontPadding: false,
  },
  mineText: {
    transform: [{ translateY: 1 }],
  },
  diamondText: {
    transform: [{ translateY: -2 }],
  },
  progressText: {
    color: "#c8d2e4",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
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
