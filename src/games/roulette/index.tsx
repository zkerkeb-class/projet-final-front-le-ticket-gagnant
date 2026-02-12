import { useEffect, useRef } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, Vibration, View } from "react-native";
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
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <View style={styles.backgroundLayerA} />
      <View style={styles.backgroundLayerB} />

      <Text style={styles.title}>ROULETTE ÉLECTRONIQUE</Text>
      <Text style={styles.subtitle}>Mode immersive · European Rules</Text>

      <View style={styles.heroPanel}>
        <View style={styles.cockpitRow}>
          <RouletteWheel spinning={spinning} result={result} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>MISE</Text>
            <Text style={styles.statValue}>{totalStake}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>SOLDE</Text>
            <Text style={styles.statValue}>{bankroll}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>NUM</Text>
            <Text style={styles.statValue}>{result ?? "--"}</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>JETON</Text>
            <Text style={styles.statValue}>{selectedChip}</Text>
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
      </View>

      <View style={styles.glassPanel}>
        <Text style={styles.panelLabel}>Choisis ton jeton</Text>
        <ChipSelector chips={DEFAULT_CHIPS} selectedChip={selectedChip} onSelect={setSelectedChip} />
      </View>

      <View style={styles.controlsRow}>
        <NeonButton
          label="Lancer"
          onPress={() => {
            spinWheel();
          }}
          disabled={spinning || bets.length === 0}
        />
        <NeonButton
          label="Effacer"
          onPress={clearBets}
          disabled={spinning || bets.length === 0}
        />
        <NeonButton
          label="Doubler"
          onPress={() => {
            doubleBets();
          }}
          disabled={spinning || bets.length === 0}
        />
      </View>

      <RouletteBoard bets={bets} disabled={spinning} onPlaceBet={placeBet} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: rouletteTheme.colors.background,
  },
  screenContent: {
    padding: 14,
    gap: 12,
    paddingBottom: 24,
    position: "relative",
  },
  backgroundLayerA: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: rouletteTheme.colors.background,
  },
  backgroundLayerB: {
    position: "absolute",
    top: 0,
    left: -120,
    right: -120,
    height: 330,
    borderRadius: 220,
    backgroundColor: "rgba(74, 132, 255, 0.13)",
  },
  title: {
    color: rouletteTheme.colors.cyan,
    textAlign: "center",
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 4,
    textShadowColor: "rgba(77,231,255,0.4)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    color: rouletteTheme.colors.textSecondary,
    textAlign: "center",
    marginTop: -2,
    marginBottom: 4,
    letterSpacing: 0.5,
    fontWeight: "600",
  },
  heroPanel: {
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    borderRadius: rouletteTheme.radii.xl,
    backgroundColor: rouletteTheme.colors.panel,
    padding: 12,
    gap: 6,
    shadowColor: rouletteTheme.colors.panelGlow,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cockpitRow: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  statPill: {
    minWidth: "48%",
    borderWidth: 1,
    borderColor: "rgba(133, 202, 255, 0.48)",
    borderRadius: rouletteTheme.radii.md,
    backgroundColor: "rgba(6, 11, 24, 0.74)",
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
    marginTop: 2,
  },
  feedbackPill: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: rouletteTheme.radii.md,
    backgroundColor: "rgba(5, 10, 22, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  feedbackText: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  glassPanel: {
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    borderRadius: rouletteTheme.radii.lg,
    backgroundColor: rouletteTheme.colors.panel,
    padding: 12,
    gap: 8,
  },
  panelLabel: {
    color: rouletteTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  controlButton: {
    flex: 1,
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
    fontSize: 12,
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
