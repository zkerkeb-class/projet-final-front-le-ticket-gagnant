import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

type CrashStatus = "ACTIVE" | "LOST" | "CASHED_OUT";

type CrashApiState = {
  sessionId: string;
  status: CrashStatus;
  betAmount: number;
  currentMultiplier: number;
  crashAt: number | null;
  autoCashoutAt: number | null;
  cashedOutAt: number | null;
  payout: number;
  chipBalance: number;
  availableActions: {
    cashout: boolean;
  };
  history: number[];
};

const SKY_STARS = [
  { left: "8%", top: "10%", size: 3 },
  { left: "22%", top: "20%", size: 2 },
  { left: "36%", top: "12%", size: 2 },
  { left: "52%", top: "24%", size: 3 },
  { left: "68%", top: "14%", size: 2 },
  { left: "82%", top: "18%", size: 3 },
  { left: "92%", top: "8%", size: 2 },
];

const parsePositive = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
};

const parseOptionalPositive = (value: string): number | null => {
  if (!value.trim()) {
    return null;
  }

  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 1) {
    return Number.NaN;
  }

  return parsed;
};

export default function CrashScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { width, height } = useWindowDimensions();
  const isWide = width >= 980;
  const isPhone = width < 430;

  const [betInput, setBetInput] = useState("20");
  const [autoCashoutInput, setAutoCashoutInput] = useState("2.00");
  const [gameState, setGameState] = useState<CrashApiState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveMultiplier, setLiveMultiplier] = useState(1);
  const [rocketProgress, setRocketProgress] = useState(0);

  const animationFrameRef = useRef<number | null>(null);
  const roundStartedAtRef = useRef<number | null>(null);

  const isActiveRound = gameState?.status === "ACTIVE";

  const apiCall = async (path: "/start" | "/state" | "/cashout", payload?: Record<string, unknown>) => {
    const baseUrls = getApiBaseUrls("games/crash");
    let lastError: Error | null = null;
    const token = await authStorage.getToken();

    if (!token) {
      throw new Error("Session expirée. Veuillez vous reconnecter.");
    }

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: path === "/state" ? "POST" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload ?? {}),
        });

        const rawBody = await response.text();
        const data = rawBody ? JSON.parse(rawBody) : null;

        if (!response.ok) {
          throw new Error(data?.message ?? `Erreur API Crash (${response.status})`);
        }

        return data as CrashApiState;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Erreur réseau inconnue.");
      }
    }

    throw new Error(lastError?.message ?? "Impossible de contacter l'API Crash.");
  };

  const canStart = useMemo(() => {
    const bet = parsePositive(betInput);
    const auto = parseOptionalPositive(autoCashoutInput);

    return Number.isFinite(bet) && !Number.isNaN(auto ?? Number.NaN) && !loading;
  }, [autoCashoutInput, betInput, loading]);

  const stopAnimationLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const updateLiveAnimation = () => {
    if (!isActiveRound || !roundStartedAtRef.current) {
      stopAnimationLoop();
      return;
    }

    const elapsedSec = (Date.now() - roundStartedAtRef.current) / 1000;
    const multiplier = Math.max(1, Math.exp(0.06 * elapsedSec));
    const rounded = Math.round(multiplier * 100) / 100;

    setLiveMultiplier(rounded);
    setRocketProgress(Math.min(1, (rounded - 1) / 9));

    animationFrameRef.current = requestAnimationFrame(updateLiveAnimation);
  };

  useEffect(() => {
    if (!isActiveRound) {
      stopAnimationLoop();
      return;
    }

    roundStartedAtRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(updateLiveAnimation);

    return () => {
      stopAnimationLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveRound, gameState?.sessionId]);

  useEffect(() => {
    if (!gameState?.sessionId || gameState.status !== "ACTIVE") {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const latest = await apiCall("/state", {
          sessionId: gameState.sessionId,
        });

        setGameState(latest);

        if (latest.status !== "ACTIVE") {
          stopAnimationLoop();
          setLiveMultiplier(latest.cashedOutAt ?? latest.crashAt ?? latest.currentMultiplier);
          setRocketProgress(Math.min(1, ((latest.cashedOutAt ?? latest.crashAt ?? 1) - 1) / 9));
          Alert.alert(
            "Résultat",
            latest.status === "CASHED_OUT"
              ? `Encaissement réussi: +${latest.payout.toFixed(2)} jetons`
              : `Crash à x${(latest.crashAt ?? latest.currentMultiplier).toFixed(2)} !`,
          );
        }
      } catch {
        // polling silence
      }
    }, 260);

    return () => {
      clearInterval(timer);
    };
  }, [gameState?.sessionId, gameState?.status]);

  const handleStart = async () => {
    const bet = parsePositive(betInput);
    const auto = parseOptionalPositive(autoCashoutInput);

    if (!Number.isFinite(bet) || Number.isNaN(auto ?? Number.NaN)) {
      const message = "Mise ou auto-cashout invalide (auto > 1).";
      setErrorMessage(message);
      Alert.alert("Paramètres invalides", message);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const state = await apiCall("/start", {
        betAmount: bet,
        autoCashoutAt: auto,
      });

      setGameState(state);
      setLiveMultiplier(1);
      setRocketProgress(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de démarrer Crash.";
      setErrorMessage(message);
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!gameState?.sessionId || gameState.status !== "ACTIVE" || loading) {
      return;
    }

    try {
      setLoading(true);
      const state = await apiCall("/cashout", {
        sessionId: gameState.sessionId,
      });
      setGameState(state);

      if (state.status === "CASHED_OUT") {
        stopAnimationLoop();
        setLiveMultiplier(state.cashedOutAt ?? state.currentMultiplier);
        setRocketProgress(Math.min(1, ((state.cashedOutAt ?? state.currentMultiplier) - 1) / 9));
        Alert.alert("Résultat", `Encaissement: +${state.payout.toFixed(2)} jetons`);
      }
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Cashout impossible.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplay = () => {
    setGameState(null);
    setLiveMultiplier(1);
    setRocketProgress(0);
    setErrorMessage(null);
  };

  const displayedMultiplier = gameState?.status === "ACTIVE"
    ? liveMultiplier
    : (gameState?.cashedOutAt ?? gameState?.crashAt ?? liveMultiplier);

  const history = gameState?.history ?? [];
  const flightSkyMaxHeight = Math.floor(height * 0.75);
  const flightSkyPreferredHeight = isWide ? Math.floor(height * 0.5) : Math.floor(height * 0.44);
  const flightSkyHeight = Math.min(flightSkyMaxHeight, Math.max(240, flightSkyPreferredHeight));
  const acceleratedPathProgress = Math.min(1, rocketProgress * 2.5);
  const visualFlightProgress = Math.min(1, 1 - Math.pow(1 - acceleratedPathProgress, 1.55));
  const curveStartX = 6;
  const curveSpanX = 88;
  const curveStartY = 90;
  const curveSpanY = 82;
  const curveExponent = 1.55;

  const getCurvePosition = (progress: number) => {
    const t = Math.max(0, Math.min(1, progress));
    const eased = Math.pow(t, curveExponent);
    return {
      x: curveStartX + t * curveSpanX,
      y: curveStartY - eased * curveSpanY,
    };
  };

  const rocketPosition = getCurvePosition(visualFlightProgress);

  const curvePoints = useMemo(
    () => Array.from({ length: 28 }, (_, index) => {
      const t = index / 27;
      const { x, y } = getCurvePosition(t);
      const active = t <= visualFlightProgress + 0.001;
      const distance = Math.max(0, visualFlightProgress - t);

      return {
        x,
        y,
        active,
        size: active ? 6 : 4,
        opacity: active ? Math.max(0.2, 1 - distance * 3.2) : 0.1,
      };
    }),
    [visualFlightProgress],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.page, isPhone && styles.pagePhone]}>
        <View style={[styles.layout, isPhone && styles.layoutPhone, isWide && styles.layoutWide]}>
          <View style={[styles.sidebar, isWide && styles.sidebarWide, isPhone && styles.sidebarPhone]}>
            <View style={[styles.betPanel, isPhone && styles.betPanelPhone]}>
              <View style={styles.panelHeaderRow}>
                <Text style={[styles.panelTitle, isPhone && styles.panelTitlePhone]}>Crash</Text>
                <Text style={styles.panelMeta}>Fusée x∞</Text>
              </View>

              <Text style={styles.inputLabel}>Mise</Text>
              <View style={[styles.inputWrap, isPhone && styles.inputWrapPhone]}>
                <Text style={styles.inputPrefix}>€</Text>
                <TextInput
                  style={[styles.textInput, isPhone && styles.textInputPhone]}
                  keyboardType="numeric"
                  value={betInput}
                  onChangeText={setBetInput}
                  placeholder="20"
                  placeholderTextColor="#7f8899"
                />
              </View>

              <Text style={styles.inputLabel}>Auto cashout (optionnel)</Text>
              <View style={[styles.inputWrap, isPhone && styles.inputWrapPhone]}>
                <Text style={styles.inputPrefix}>x</Text>
                <TextInput
                  style={[styles.textInput, isPhone && styles.textInputPhone]}
                  keyboardType="numeric"
                  value={autoCashoutInput}
                  onChangeText={setAutoCashoutInput}
                  placeholder="2.00"
                  placeholderTextColor="#7f8899"
                />
              </View>
            </View>

            {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

            {!gameState ? (
              <Pressable style={[styles.ctaButton, isPhone && styles.ctaButtonPhone, (!canStart || loading) && styles.ctaButtonDisabled]} onPress={handleStart} disabled={!canStart || loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.ctaButtonText, isPhone && styles.ctaButtonTextPhone]}>Lancer</Text>}
              </Pressable>
            ) : gameState.status === "ACTIVE" ? (
              <View style={[styles.actionsStack, isPhone && styles.actionsStackPhone]}>
                <Pressable style={[styles.cashoutButton, isPhone && styles.cashoutButtonPhone, loading && styles.ctaButtonDisabled]} onPress={handleCashout} disabled={loading || !gameState.availableActions.cashout}>
                  <Text style={[styles.cashoutButtonText, isPhone && styles.cashoutButtonTextPhone]}>Encaisser x{displayedMultiplier.toFixed(2)}</Text>
                </Pressable>
                <View style={styles.inGamePill}>
                  <Text style={styles.inGameText}>Vol en cours...</Text>
                </View>
              </View>
            ) : (
              <Pressable style={[styles.ctaButton, isPhone && styles.ctaButtonPhone]} onPress={handleReplay}>
                <Text style={[styles.ctaButtonText, isPhone && styles.ctaButtonTextPhone]}>Rejouer</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.tableArea, isPhone && styles.tableAreaPhone]}>
            {!isPhone ? (
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableTitle}>CRASH</Text>
                <ChipBalanceBadge userId={routeUserId} amount={gameState?.chipBalance} compact />
              </View>
            ) : null}

            {!gameState ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Prêt au décollage</Text>
                <Text style={styles.emptyText}>Définissez votre mise et cliquez sur Lancer.</Text>
              </View>
            ) : (
              <View style={styles.tableContent}>
                <View style={[styles.infoBar, isPhone && styles.infoBarPhone]}>
                  <View>
                    <Text style={styles.infoLabel}>MISE</Text>
                    <Text style={styles.infoValue}>{gameState.betAmount.toFixed(2)}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>AUTO</Text>
                    <Text style={styles.infoValue}>{gameState.autoCashoutAt ? `x${gameState.autoCashoutAt.toFixed(2)}` : "--"}</Text>
                  </View>
                  <View>
                    <Text style={styles.infoLabel}>PAYOUT</Text>
                    <Text style={styles.infoValue}>{gameState.payout.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={[styles.flightArea, isPhone && styles.flightAreaPhone]}>
                  <Text style={[styles.multiplierText, isPhone && styles.multiplierTextPhone, gameState.status === "LOST" ? styles.multiplierLost : styles.multiplierActive]}>
                    x{displayedMultiplier.toFixed(2)}
                  </Text>

                  <View style={[styles.flightSky, { height: flightSkyHeight }]}>
                    <View style={styles.skyGlow} />
                    <View style={styles.skyStarsLayer}>
                      {SKY_STARS.map((star, index) => (
                        <View
                          key={`star-${index}`}
                          style={[
                            styles.skyStar,
                            {
                              left: star.left as `${number}%`,
                              top: star.top as `${number}%`,
                              width: star.size,
                              height: star.size,
                              borderRadius: star.size / 2,
                            },
                          ]}
                        />
                      ))}
                    </View>

                    <View style={styles.curveLayer}>
                      {curvePoints.map((point, index) => (
                        <View
                          key={`curve-${index}`}
                          style={[
                            styles.curvePoint,
                            point.active ? styles.curvePointActive : styles.curvePointGuide,
                            {
                              left: `${point.x}%` as `${number}%`,
                              top: `${point.y}%` as `${number}%`,
                              width: point.size,
                              height: point.size,
                              borderRadius: point.size / 2,
                              opacity: point.opacity,
                            },
                          ]}
                        />
                      ))}
                    </View>

                    <View
                      style={[
                        styles.rocketAbsolute,
                        {
                          left: `${rocketPosition.x}%` as `${number}%`,
                          top: `${rocketPosition.y}%` as `${number}%`,
                          transform: [{ rotate: `${-18 - rocketProgress * 22}deg` }],
                        },
                      ]}
                    >
                      <View style={styles.rocketFinLeft} />
                      <View style={styles.rocketFinRight} />
                      <View style={styles.rocketBody}>
                        <View style={styles.rocketNose} />
                        <View style={styles.rocketWindow} />
                      </View>
                      <View style={[styles.rocketFlame, gameState.status === "ACTIVE" && styles.rocketFlameActive]} />
                    </View>

                  </View>

                  <Text style={styles.statusText}>
                    {gameState.status === "ACTIVE"
                      ? "En vol... encaissez avant le crash"
                      : (gameState.status === "CASHED_OUT"
                        ? `Encaissement à x${(gameState.cashedOutAt ?? displayedMultiplier).toFixed(2)}`
                        : `Crash à x${(gameState.crashAt ?? displayedMultiplier).toFixed(2)}`)}
                  </Text>
                </View>

                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Historique</Text>
                  <View style={styles.historyChips}>
                    {history.length === 0 ? <Text style={styles.historyEmpty}>--</Text> : history.map((value, index) => (
                      <View key={`h-${index}`} style={[styles.historyChip, value < 2 ? styles.historyChipLow : styles.historyChipHigh]}>
                        <Text style={styles.historyChipText}>x{value.toFixed(2)}</Text>
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
  inputWrapPhone: {
    height: 44,
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
  textInputPhone: {
    fontSize: 16,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  actionsStack: {
    gap: 10,
  },
  actionsStackPhone: {
    gap: 8,
  },
  ctaButton: {
    height: 60,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7a17ff",
  },
  ctaButtonPhone: {
    height: 46,
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
  cashoutButton: {
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#14532d",
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  cashoutButtonPhone: {
    height: 46,
  },
  cashoutButtonText: {
    color: "#dcfce7",
    fontSize: 20,
    fontWeight: "900",
  },
  cashoutButtonTextPhone: {
    fontSize: 14,
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
    letterSpacing: 1,
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
  flightArea: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1d2d48",
    backgroundColor: "rgba(10, 19, 32, 0.86)",
    padding: 18,
    gap: 12,
    minHeight: 320,
    justifyContent: "space-between",
  },
  flightAreaPhone: {
    padding: 12,
    minHeight: 280,
  },
  multiplierText: {
    fontSize: 54,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 1.2,
  },
  multiplierTextPhone: {
    fontSize: 42,
  },
  multiplierActive: {
    color: "#60a5fa",
  },
  multiplierLost: {
    color: "#f87171",
  },
  flightSky: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#27406a",
    backgroundColor: "rgba(9, 18, 32, 0.95)",
    overflow: "hidden",
    position: "relative",
  },
  skyGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    right: -70,
    top: -120,
    backgroundColor: "rgba(96, 165, 250, 0.15)",
  },
  skyStarsLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  skyStar: {
    position: "absolute",
    backgroundColor: "rgba(231, 243, 255, 0.95)",
  },
  curveLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  curvePoint: {
    position: "absolute",
    marginLeft: -3,
    marginTop: -3,
  },
  curvePointGuide: {
    backgroundColor: "rgba(80, 125, 184, 0.6)",
  },
  curvePointActive: {
    backgroundColor: "#7dd3fc",
  },
  rocketAbsolute: {
    position: "absolute",
    marginLeft: -15,
    marginTop: -20,
    width: 30,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rocketBody: {
    width: 18,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f4f6fb",
    borderWidth: 1,
    borderColor: "#9fb8dc",
    alignItems: "center",
    position: "relative",
    justifyContent: "center",
  },
  rocketNose: {
    position: "absolute",
    top: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#ff6b6b",
  },
  rocketWindow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0ea5e9",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  rocketFinLeft: {
    position: "absolute",
    left: 2,
    bottom: 10,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 0,
    borderRightWidth: 8,
    borderTopColor: "#ef4444",
    borderBottomColor: "transparent",
    borderRightColor: "transparent",
  },
  rocketFinRight: {
    position: "absolute",
    right: 2,
    bottom: 10,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 0,
    borderLeftWidth: 8,
    borderTopColor: "#ef4444",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  rocketFlame: {
    width: 6,
    height: 12,
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: "rgba(251, 191, 36, 0.55)",
  },
  rocketFlameActive: {
    height: 16,
    backgroundColor: "rgba(251, 191, 36, 0.95)",
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
