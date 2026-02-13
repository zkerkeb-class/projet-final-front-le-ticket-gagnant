import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
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
import { getApiBaseUrls } from "@/src/services/apiBaseUrl";
import { authStorage } from "@/src/services/authStorage";

type BetArea = "PLAYER" | "BANKER" | "TIE";

type CardType = {
  label: string;
  points: number;
};

type BaccaratApiState = {
  status: "WON" | "LOST";
  betArea: BetArea;
  betAmount: number;
  payout: number;
  outcome: number;
  result: BetArea;
  player: {
    hand: CardType[];
    total: number;
  };
  banker: {
    hand: CardType[];
    total: number;
  };
  natural: boolean;
  chipBalance: number;
  payouts: Record<BetArea, number>;
};

const DEAL_INTERVAL_MS = 380;
const RESULT_PANEL_DELAY_MS = 360;

const parseBetAmount = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  if (!normalized) {
    return Number.NaN;
  }

  return Number(normalized);
};

function AnimatedBaccaratCard({
  card,
  lane,
  compact,
}: {
  card: CardType;
  lane: "player" | "banker";
  compact?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const startTranslateX = 260;
  const startTranslateY = lane === "banker" ? 74 : -74;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(40),
      Animated.timing(progress, {
        toValue: 1,
        duration: 420,
        easing: Easing.bezier(0.2, 0.82, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress]);

  const cardStyle = {
    opacity: progress,
    transform: [
      {
        translateX: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [startTranslateX, 0],
        }),
      },
      {
        translateY: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [startTranslateY, 0],
        }),
      },
      {
        rotate: progress.interpolate({
          inputRange: [0, 1],
          outputRange: ["7deg", "0deg"],
        }),
      },
      {
        scale: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.cardTile, compact && styles.cardTilePhone, cardStyle]}>
      <Text style={styles.cardLabel}>{card.label}</Text>
      <Text style={styles.cardPoints}>{card.points}</Text>
    </Animated.View>
  );
}

export default function BaccaratScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const isPhone = width < 430;

  const [betInput, setBetInput] = useState("25");
  const [betArea, setBetArea] = useState<BetArea>("PLAYER");
  const [gameState, setGameState] = useState<BaccaratApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visiblePlayerCount, setVisiblePlayerCount] = useState(0);
  const [visibleBankerCount, setVisibleBankerCount] = useState(0);
  const [dealTick, setDealTick] = useState(0);
  const [showResultPanel, setShowResultPanel] = useState(false);

  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const deckPulse = useRef(new Animated.Value(0)).current;
  const deckKick = useRef(new Animated.Value(0)).current;

  const canPlay = useMemo(() => {
    const amount = parseBetAmount(betInput);
    return Number.isFinite(amount) && amount > 0 && !loading;
  }, [betInput, loading]);

  const isDealing = Boolean(gameState)
    && (visiblePlayerCount < (gameState?.player.hand.length ?? 0)
      || visibleBankerCount < (gameState?.banker.hand.length ?? 0));

  const apiCall = async (payload: Record<string, unknown>) => {
    const baseUrls = getApiBaseUrls("games/baccarat");
    let lastError: Error | null = null;
    const token = await authStorage.getToken();

    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/play`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(data?.message ?? `Erreur API Baccarat (${response.status})`);
        }

        return data as BaccaratApiState;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Erreur réseau inconnue.");
      }
    }

    throw new Error(lastError?.message ?? "Impossible de contacter l'API Baccarat.");
  };

  const handlePlay = async () => {
    const betAmount = parseBetAmount(betInput);
    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      const message = "Entrez une mise valide supérieure à 0.";
      setErrorMessage(message);
      Alert.alert("Mise invalide", message);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const nextState = await apiCall({
        betArea,
        betAmount,
      });

      setGameState(nextState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de jouer la main.";
      setErrorMessage(message);
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setGameState(null);
    setErrorMessage(null);
  };

  useEffect(() => {
    const clearTimers = () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };

    clearTimers();

    if (!gameState) {
      setVisiblePlayerCount(0);
      setVisibleBankerCount(0);
      setShowResultPanel(false);
      return clearTimers;
    }

    setVisiblePlayerCount(0);
    setVisibleBankerCount(0);
    setShowResultPanel(false);

    const steps: Array<"PLAYER" | "BANKER"> = [];

    if (gameState.player.hand.length > 0) {
      steps.push("PLAYER");
    }
    if (gameState.banker.hand.length > 0) {
      steps.push("BANKER");
    }
    if (gameState.player.hand.length > 1) {
      steps.push("PLAYER");
    }
    if (gameState.banker.hand.length > 1) {
      steps.push("BANKER");
    }
    if (gameState.player.hand.length > 2) {
      steps.push("PLAYER");
    }
    if (gameState.banker.hand.length > 2) {
      steps.push("BANKER");
    }

    let playerVisible = 0;
    let bankerVisible = 0;

    steps.forEach((step, index) => {
      const timeout = setTimeout(() => {
        if (step === "PLAYER") {
          playerVisible += 1;
          setVisiblePlayerCount(playerVisible);
        } else {
          bankerVisible += 1;
          setVisibleBankerCount(bankerVisible);
        }
        setDealTick((tick) => tick + 1);
      }, 120 + ((index + 1) * DEAL_INTERVAL_MS));

      timeoutsRef.current.push(timeout);
    });

    return clearTimers;
  }, [gameState?.betAmount, gameState?.result]);

  useEffect(() => {
    if (!gameState || isDealing) {
      setShowResultPanel(false);
      return;
    }

    const timeout = setTimeout(() => {
      setShowResultPanel(true);
    }, RESULT_PANEL_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [gameState, isDealing]);

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
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(deckPulse, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulseLoop.start();

    return () => pulseLoop.stop();
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
      {
        translateX: deckKick.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
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

  const visiblePlayerHand = gameState?.player.hand.slice(0, visiblePlayerCount) ?? [];
  const visibleBankerHand = gameState?.banker.hand.slice(0, visibleBankerCount) ?? [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <View style={[styles.layout, isPhone && styles.layoutPhone, isWide && styles.layoutWide]}>
          <View style={[styles.sidebar, isWide && styles.sidebarWide, isPhone && styles.sidebarPhone]}>
            <View style={[styles.betPanel, isPhone && styles.betPanelPhone]}>
              <View style={styles.panelHeaderRow}>
                <Text style={[styles.panelTitle, isPhone && styles.panelTitlePhone]}>Baccarat</Text>
                <Text style={styles.panelMeta}>Commission incluse</Text>
              </View>

              <Text style={styles.inputLabel}>Mise</Text>
              <View style={[styles.inputWrap, isPhone && styles.inputWrapPhone]}>
                <Text style={styles.inputPrefix}>€</Text>
                <TextInput
                  style={[styles.textInput, isPhone && styles.textInputPhone]}
                  keyboardType="numeric"
                  value={betInput}
                  onChangeText={(value) => {
                    setBetInput(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="25"
                  placeholderTextColor="#7f8899"
                />
              </View>

              <Text style={styles.inputLabel}>Zone de pari</Text>
              <View style={[styles.betAreaRow, isPhone && styles.betAreaRowPhone]}>
                {(["PLAYER", "BANKER", "TIE"] as const).map((area) => (
                  <Pressable
                    key={area}
                    style={[styles.betAreaButton, isPhone && styles.betAreaButtonPhone, betArea === area ? styles.betAreaButtonActive : null]}
                    onPress={() => setBetArea(area)}
                  >
                    <Text style={[styles.betAreaText, betArea === area ? styles.betAreaTextActive : null]}>{area}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            <View style={[styles.actionsStack, isPhone && styles.actionsStackPhone]}>
              <Pressable style={[styles.ctaButton, isPhone && styles.ctaButtonPhone, !canPlay && styles.ctaButtonDisabled]} onPress={handlePlay} disabled={!canPlay}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.ctaButtonText, isPhone && styles.ctaButtonTextPhone]}>Distribuer</Text>}
              </Pressable>
              {!!gameState && (
                <Pressable style={[styles.secondaryButton, isPhone && styles.secondaryButtonPhone]} onPress={handleReset}>
                  <Text style={styles.secondaryButtonText}>Nouvelle main</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={[styles.tableArea, isPhone && styles.tableAreaPhone]}>
            {!isPhone ? (
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableTitle}>🃟 BACCARAT</Text>
                <ChipBalanceBadge userId={routeUserId} amount={gameState?.chipBalance} compact />
              </View>
            ) : null}

            {!gameState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Table prête</Text>
                <Text style={styles.emptyText}>Choisis PLAYER, BANKER ou TIE puis distribue une main.</Text>
              </View>
            ) : (
              <View style={styles.tableContent}>
                <View style={[styles.infoBar, isPhone && styles.infoBarPhone]}>
                  <View>
                    <Text style={styles.infoLabel}>Résultat</Text>
                    <Text style={styles.infoValue}>{gameState.result}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Mise</Text>
                    <Text style={styles.infoValue}>{gameState.betAmount.toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>Net</Text>
                    <Text style={[styles.infoValue, gameState.outcome >= 0 ? styles.resultWin : styles.resultLoss]}>
                      {gameState.outcome >= 0 ? "+" : ""}{gameState.outcome.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.phaseBanner}>
                  <Text style={styles.phaseBannerText}>
                    {isDealing ? "Distribution en cours..." : "Main révélée"}
                  </Text>
                </View>

                <View style={[styles.playMat, isPhone && styles.playMatPhone]}>
                  <Animated.View style={[styles.virtualDeckWrap, isPhone && styles.virtualDeckWrapPhone, deckPulseStyle]}>
                    <View style={styles.virtualDeckShadowA} />
                    <View style={styles.virtualDeckShadowB} />
                    <View style={styles.virtualDeckTop}>
                      <Text style={styles.virtualDeckTopText}>SHOE</Text>
                    </View>
                  </Animated.View>

                <View style={styles.handSection}>
                  <View style={styles.handHeaderRow}>
                    <Text style={styles.handTitle}>PLAYER</Text>
                    <Text style={styles.handTotal}>Total {visiblePlayerCount === gameState.player.hand.length ? gameState.player.total : "..."}</Text>
                  </View>
                  <View style={[styles.cardsRow, isPhone && styles.cardsRowPhone]}>{visiblePlayerHand.map((card, index) => <AnimatedBaccaratCard key={`p-${card.label}-${index}`} card={card} lane="player" compact={isPhone} />)}</View>
                </View>

                <View style={styles.handSection}>
                  <View style={styles.handHeaderRow}>
                    <Text style={styles.handTitle}>BANKER</Text>
                    <Text style={styles.handTotal}>Total {visibleBankerCount === gameState.banker.hand.length ? gameState.banker.total : "..."}</Text>
                  </View>
                  <View style={[styles.cardsRow, isPhone && styles.cardsRowPhone]}>{visibleBankerHand.map((card, index) => <AnimatedBaccaratCard key={`b-${card.label}-${index}`} card={card} lane="banker" compact={isPhone} />)}</View>
                </View>

                </View>

                {showResultPanel && (
                  <View style={styles.resultPanel}>
                    <Text style={styles.resultTitle}>{gameState.natural ? "Natural" : "Main résolue"}</Text>
                    <Text style={[styles.resultText, gameState.outcome >= 0 ? styles.resultWin : styles.resultLoss]}>
                      Paiement: {gameState.payout.toFixed(2)}
                    </Text>
                    <Text style={styles.resultSub}>
                      Table: PLAYER x{gameState.payouts.PLAYER} • BANKER x{gameState.payouts.BANKER} • TIE x{gameState.payouts.TIE}
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
  pagePhone: {
    padding: 10,
  },
  layout: {
    flexDirection: "column",
    gap: 14,
  },
  layoutPhone: {
    flexDirection: "column-reverse",
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
  sidebarPhone: {
    padding: 8,
    gap: 8,
  },
  sidebarWide: {
    width: 360,
  },
  betPanel: {
    gap: 10,
  },
  betPanelPhone: {
    gap: 8,
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
  panelTitlePhone: {
    fontSize: 20,
  },
  panelMeta: {
    color: "#9fb2ce",
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: "#1c2940",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  inputLabel: {
    color: "#cdd7e5",
    fontSize: 13,
    fontWeight: "700",
  },
  inputWrap: {
    backgroundColor: "#182132",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3c5a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 58,
    gap: 8,
  },
  inputWrapPhone: {
    height: 46,
  },
  inputPrefix: {
    color: "#9ec8ff",
    fontSize: 16,
    fontWeight: "800",
  },
  textInput: {
    flex: 1,
    color: "#f4f6fa",
    fontSize: 30,
    fontWeight: "700",
    paddingVertical: 0,
  },
  textInputPhone: {
    fontSize: 18,
  },
  betAreaRow: {
    flexDirection: "row",
    gap: 8,
  },
  betAreaRowPhone: {
    gap: 6,
  },
  betAreaButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3d5c",
    backgroundColor: "#152033",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  betAreaButtonPhone: {
    paddingVertical: 8,
  },
  betAreaButtonActive: {
    backgroundColor: "#2a3d63",
    borderColor: "#4e74b8",
  },
  betAreaText: {
    color: "#afbbcd",
    fontSize: 13,
    fontWeight: "800",
  },
  betAreaTextActive: {
    color: "#e8eefc",
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  actionsStack: {
    gap: 8,
  },
  actionsStackPhone: {
    gap: 7,
  },
  ctaButton: {
    height: 64,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6e22ff",
    borderWidth: 1,
    borderColor: "#8c54ff",
  },
  ctaButtonPhone: {
    height: 48,
  },
  ctaButtonDisabled: {
    opacity: 0.45,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
  },
  ctaButtonTextPhone: {
    fontSize: 17,
  },
  secondaryButton: {
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#192740",
    borderWidth: 1,
    borderColor: "#30486f",
  },
  secondaryButtonPhone: {
    height: 42,
  },
  secondaryButtonText: {
    color: "#d5e3ff",
    fontSize: 14,
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
  tableAreaPhone: {
    padding: 10,
    minHeight: 500,
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
  },
  tableTitlePhone: {
    fontSize: 20,
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
  playMat: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1d2d48",
    backgroundColor: "rgba(10, 19, 32, 0.86)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  playMatPhone: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  virtualDeckWrap: {
    position: "absolute",
    right: 18,
    top: 16,
    width: 72,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  virtualDeckWrapPhone: {
    width: 62,
    right: 8,
    top: 10,
  },
  virtualDeckShadowA: {
    position: "absolute",
    width: 60,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a4c6e",
    backgroundColor: "#111a2a",
    transform: [{ translateX: -5 }, { translateY: -5 }],
  },
  virtualDeckShadowB: {
    position: "absolute",
    width: 60,
    height: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#3a4c6e",
    backgroundColor: "#111a2a",
    transform: [{ translateX: -2 }, { translateY: -2 }],
  },
  virtualDeckTop: {
    width: 60,
    height: 88,
    borderRadius: 10,
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
  infoBarPhone: {
    paddingHorizontal: 10,
    paddingVertical: 10,
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
    borderColor: "#2a3d60",
    backgroundColor: "rgba(16, 25, 40, 0.72)",
    padding: 12,
    gap: 8,
  },
  handHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  handTitle: {
    color: "#f4f7fb",
    fontSize: 16,
    fontWeight: "800",
  },
  handTotal: {
    color: "#9ec8ff",
    fontSize: 13,
    fontWeight: "700",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    minHeight: 86,
    alignItems: "center",
  },
  cardsRowPhone: {
    gap: 6,
    minHeight: 78,
  },
  cardTile: {
    width: 56,
    height: 78,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#324766",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  cardTilePhone: {
    width: 50,
    height: 72,
  },
  cardLabel: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  cardPoints: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
  },
  resultPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a3d60",
    backgroundColor: "rgba(21, 30, 48, 0.85)",
    padding: 14,
    gap: 6,
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
  resultSub: {
    color: "#9eb2d1",
    fontSize: 13,
    fontWeight: "700",
  },
  resultWin: {
    color: "#86efac",
  },
  resultLoss: {
    color: "#fca5a5",
  },
});
