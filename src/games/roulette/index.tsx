import ChipBalanceBadge from "@/src/components/ChipBalanceBadge";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import {
    Animated,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    Vibration,
    View,
    useWindowDimensions,
} from "react-native";
import { rouletteTheme } from "./assets/theme";
import { ChipSelector } from "./components/ChipSelector";
import { RouletteBoard } from "./components/RouletteBoard";
import { RouletteWheel } from "./components/RouletteWheel";
import { DEFAULT_CHIPS, useRouletteGame } from "./hooks/useRouletteGame";

function NeonButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        styles.controlButton,
        hovered && !disabled ? styles.controlButtonHover : null,
        pressed && !disabled ? styles.controlButtonPressed : null,
        disabled ? styles.controlButtonDisabled : null,
      ]}
    >
      <View style={styles.controlButtonGlow} />
      <View style={styles.controlButtonGloss} />
      <Text style={styles.controlButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function RouletteGame() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  const {
    bankroll,
    selectedChip,
    bets,
    totalStake,
    spinning,
    result,
    history,
    lastSpin,
    setSelectedChip,
    placeBet,
    clearBets,
    doubleBets,
    spinWheel,
    onResultGenerated,
  } = useRouletteGame(1000);

  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackTranslate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!spinning) return;
    Vibration.vibrate(45);
  }, [spinning]);

  useEffect(() => {
    if (!lastSpin) return;

    if (lastSpin.net > 0) {
      Vibration.vibrate([0, 40, 80, 40]);
    } else {
      Vibration.vibrate([0, 120]);
    }

    feedbackOpacity.setValue(0);
    feedbackTranslate.setValue(8);

    Animated.parallel([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackTranslate, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [lastSpin, feedbackOpacity, feedbackTranslate]);

  const feedbackIsWin = lastSpin ? lastSpin.net > 0 : false;
  const feedbackColor = feedbackIsWin ? rouletteTheme.colors.success : rouletteTheme.colors.danger;
  const feedbackText = lastSpin
    ? feedbackIsWin
      ? `GAIN +${lastSpin.net} JETONS · NUMÉRO ${lastSpin.result}`
      : `PERTE ${Math.abs(lastSpin.net)} JETONS · NUMÉRO ${lastSpin.result}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={[styles.layout, isWide && styles.layoutWide]}>
          <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
            <View style={styles.betPanel}>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>Roulette</Text>
                <Text style={styles.panelMeta}>European</Text>
              </View>

              <View style={styles.infoBar}>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Mise totale</Text>
                  <Text style={styles.infoValue}>{totalStake}</Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text style={styles.infoLabel}>Jeton actif</Text>
                  <Text style={styles.infoValue}>{selectedChip}</Text>
                </View>
              </View>

              <Text style={styles.panelLabel}>Choisis ton jeton</Text>
              <ChipSelector chips={DEFAULT_CHIPS} selectedChip={selectedChip} onSelect={setSelectedChip} />
            </View>

            <View style={styles.actionsStack}>
              <NeonButton
                label="Lancer"
                onPress={spinWheel}
                disabled={spinning || bets.length === 0}
              />
              <NeonButton
                label="Effacer"
                onPress={clearBets}
                disabled={spinning || bets.length === 0}
              />
              <NeonButton
                label="Doubler"
                onPress={doubleBets}
                disabled={spinning || bets.length === 0}
              />

              {spinning ? (
                <View style={styles.inGamePill}>
                  <Text style={styles.inGameText}>Rien ne va plus...</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.tableArea}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableTitle}>ROULETTE</Text>
              <ChipBalanceBadge userId={routeUserId} amount={bankroll} compact />
            </View>

            <View style={styles.tableContent}>
              <RouletteWheel spinning={spinning} result={result} onResultGenerated={onResultGenerated} />

              <View style={styles.statsRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statLabel}>SOLDE</Text>
                  <Text style={styles.statValue}>{bankroll}</Text>
                </View>
                <View style={styles.statPill}>
                  <Text style={styles.statLabel}>NUMÉRO</Text>
                  <Text style={styles.statValue}>{result ?? "--"}</Text>
                </View>
              </View>

              <Text style={styles.historyText}>
                Historique: {history.length > 0 ? history.join(" · ") : "-"}
              </Text>

              {feedbackText ? (
                <Animated.View
                  style={[
                    styles.feedbackPill,
                    {
                      borderColor: feedbackColor,
                      opacity: feedbackOpacity,
                      transform: [{ translateY: feedbackTranslate }],
                    },
                  ]}
                >
                  <Text style={[styles.feedbackText, { color: feedbackColor }]}>{feedbackText}</Text>
                </Animated.View>
              ) : null}

              <RouletteBoard bets={bets} disabled={spinning} onPlaceBet={placeBet} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: rouletteTheme.colors.background,
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
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    borderRadius: rouletteTheme.radii.lg,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
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
    color: rouletteTheme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
  panelMeta: {
    color: rouletteTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  infoBar: {
    backgroundColor: rouletteTheme.colors.panel,
    borderRadius: rouletteTheme.radii.md,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoBlock: {
    gap: 3,
  },
  infoLabel: {
    color: rouletteTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  infoValue: {
    color: rouletteTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },
  panelLabel: {
    color: rouletteTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  actionsStack: {
    gap: 10,
  },
  inGamePill: {
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    borderRadius: rouletteTheme.radii.md,
    backgroundColor: rouletteTheme.colors.panel,
    paddingVertical: 9,
    alignItems: "center",
  },
  inGameText: {
    color: rouletteTheme.colors.cyan,
    fontWeight: "700",
  },
  tableArea: {
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    borderRadius: rouletteTheme.radii.xl,
    backgroundColor: rouletteTheme.colors.panel,
    padding: 12,
    gap: 12,
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableTitle: {
    color: rouletteTheme.colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  tableContent: {
    gap: 10,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    borderRadius: rouletteTheme.radii.md,
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  statLabel: {
    color: rouletteTheme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: "800",
  },
  statValue: {
    color: rouletteTheme.colors.textPrimary,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
  },
  historyText: {
    color: rouletteTheme.colors.textSecondary,
    fontSize: 12,
  },
  feedbackPill: {
    borderWidth: 1,
    borderRadius: rouletteTheme.radii.md,
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feedbackText: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  controlButton: {
    minHeight: 48,
    borderRadius: rouletteTheme.radii.md,
    borderWidth: 1,
    borderColor: "rgba(101, 222, 255, 0.72)",
    backgroundColor: "rgba(8, 16, 36, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  controlButtonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(77, 231, 255, 0.15)",
  },
  controlButtonGloss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  controlButtonText: {
    color: rouletteTheme.colors.textPrimary,
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  controlButtonHover: {
    borderColor: rouletteTheme.colors.cyan,
    shadowColor: rouletteTheme.colors.cyan,
    shadowOpacity: 0.52,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  controlButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  controlButtonDisabled: {
    opacity: 0.45,
  },
});
