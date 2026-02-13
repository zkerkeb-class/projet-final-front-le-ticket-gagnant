import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { rouletteTheme } from "../assets/theme";
import { BLACK_NUMBERS, RED_NUMBERS } from "../utils/payouts";

type RouletteWheelProps = {
  spinning: boolean;
  result: number | null;
  onResultGenerated?: (result: number) => void;
};

const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
] as const;

const SLOT_COUNT = EUROPEAN_WHEEL_ORDER.length;
const SLOT_ANGLE = 360 / SLOT_COUNT; // ~9.73°

function getPocketColor(number: number) {
  if (number === 0) {
    return rouletteTheme.colors.success;
  }

  if (RED_NUMBERS.includes(number)) {
    return rouletteTheme.colors.red;
  }

  if (BLACK_NUMBERS.includes(number)) {
    return rouletteTheme.colors.black;
  }

  return rouletteTheme.colors.textSecondary;
}

function getResultColor(number: number | null) {
  if (number === null) {
    return rouletteTheme.colors.textSecondary;
  }

  return getPocketColor(number);
}

export function RouletteWheel({ spinning, result, onResultGenerated }: RouletteWheelProps) {
  const { width } = useWindowDimensions();

  const [settledResult, setSettledResult] = useState<number | null>(null);

  // ========== PRINCIPE D'ACCUMULATION ==========
  // On ne remet JAMAIS ces valeurs à zéro - elles accumulent les degrés
  const wheelRotationDegrees = useRef(0);
  const ballRotationDegrees = useRef(0);

  // Animated values
  const wheelAngle = useRef(new Animated.Value(0)).current;
  const ballAngle = useRef(new Animated.Value(0)).current;
  const ballLane = useRef(new Animated.Value(0)).current;

  const previousSpinningRef = useRef(false);

  const wheelSize = useMemo(() => {
    const available = width - 44;
    return Math.max(250, Math.min(330, available));
  }, [width]);

  const wheelScale = wheelSize / 330;

  // Interpolations simples: degrés → rotation CSS
  const wheelRotation = wheelAngle.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend", // Permet d'accumuler au-delà de 360°
  });

  const ballRotation = ballAngle.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend", // Permet d'accumuler au-delà de 360°
  });

  const ballLaneOffset = ballLane.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 90], // Descente de la bille
  });

  const resultColor = useMemo(() => getResultColor(settledResult), [settledResult]);

  const winningIndex = useMemo(() => {
    if (settledResult === null) {
      return null;
    }
    const index = (EUROPEAN_WHEEL_ORDER as readonly number[]).indexOf(settledResult);
    return index >= 0 ? index : 0;
  }, [settledResult]);

  // ========== LOGIQUE DU POINTEUR FIXE ==========
  // La bille s'arrête TOUJOURS en haut (0°)
  // On fait tourner la roue pour amener le bon numéro sous la bille
  
  // Animation immédiate quand spinning démarre
  useEffect(() => {
    const justStartedSpinning = !previousSpinningRef.current && spinning;
    previousSpinningRef.current = spinning;

    if (!justStartedSpinning) {
      return;
    }

    // Cacher le numéro pendant que la roue tourne
    setSettledResult(null);

    // ===== RÉINITIALISATION : Remettre tout à 0 comme au premier tour =====
    wheelRotationDegrees.current = 0;
    ballRotationDegrees.current = 0;
    wheelAngle.setValue(0);
    ballAngle.setValue(0);

    // ===== CONFIGURATION =====
    const nbSegments = 37; // Roulette européenne
    const tailleSegment = 360 / nbSegments; // ≈ 9.73° par case
    const wheelSpins = 5; // Nombre de tours de la roue
    const ballSpins = 10; // Nombre de tours de la bille
    
    // VARIABLE MAGIQUE DE CALIBRAGE (ajuster si décalage)
    const CORRECTION = 0;

    // ===== GÉNÉRATION DU RÉSULTAT =====
    // Angle aléatoire où la bille s'arrête (0-360°)
    const offset = Math.floor(Math.random() * 360);
    
    // Générer le numéro gagnant (0-36)
    const winningNumber = Math.floor(Math.random() * 37);
    
    // Envoyer le résultat au parent (hook) pour les calculs de gains
    if (onResultGenerated) {
      onResultGenerated(winningNumber);
    }

    // ===== CALCUL DE LA POSITION DU GAGNANT =====
    // Trouver l'index du gagnant dans l'ordre de la roue
    const indexGagnant = (EUROPEAN_WHEEL_ORDER as readonly number[]).indexOf(winningNumber);
    
    // Position de la case gagnante sur la roue (ex: case 0 est à 0°, case 1 à 9.73°, etc.)
    const angleDuGagnant = indexGagnant * tailleSegment;

    // ===== CALCUL SIMPLIFIÉ (on part toujours de 0) =====
    // Position cible (où la bille s'arrête)
    const positionCible = offset;
    
    // Rotation nécessaire pour amener le gagnant à la cible
    const rotationRoue = (positionCible - angleDuGagnant + CORRECTION) + (wheelSpins * 360);
    
    // Position finale de la roue
    const newWheelDegrees = rotationRoue;

    // ===== BILLE (tourne dans le sens inverse) =====
    // La bille fait ses tours et finit à la position offset
    const rotationBille = (-360 * ballSpins) + offset;
    const newBallDegrees = rotationBille;

    console.log(`[Roulette] RESET à 0 | Résultat: ${winningNumber} (index ${indexGagnant}, angle ${angleDuGagnant.toFixed(1)}°) | Offset: ${offset}° | CORRECTION: ${CORRECTION}° | Roue: ${newWheelDegrees.toFixed(1)}° | Bille: ${newBallDegrees.toFixed(1)}°`);

    // La bille reste à distance fixe - pas de descente
    ballLane.setValue(0);

    // Animation - SANS la descente de la bille
    Animated.parallel([
      Animated.timing(wheelAngle, {
        toValue: newWheelDegrees,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(ballAngle, {
        toValue: newBallDegrees,
        duration: 3500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        return;
      }

      // Sauvegarder pour le prochain spin
      wheelRotationDegrees.current = newWheelDegrees;
      ballRotationDegrees.current = newBallDegrees;
      
      // Afficher le résultat À LA FIN de l'animation
      setSettledResult(winningNumber);
    });
  }, [spinning, wheelAngle, ballAngle, ballLane]);

  return (
    <View style={[styles.container, { width: wheelSize, height: wheelSize }]}>
      <View style={[styles.stage, { transform: [{ scale: wheelScale }] }]}>
        <View style={styles.outerRing}>
          <Animated.View style={[styles.wheel, { transform: [{ rotate: wheelRotation }] }]}>
            {EUROPEAN_WHEEL_ORDER.map((number, index) => {
              const angle = index * SLOT_ANGLE;
              const isWinning = winningIndex === index && !spinning;

              return (
                <View
                  key={number}
                  style={[
                    styles.slotWrap,
                    {
                      transform: [{ rotate: `${angle}deg` }, { translateY: -106 }],
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.slot,
                      { backgroundColor: getPocketColor(number) },
                      isWinning ? styles.slotWinning : null,
                    ]}
                  >
                    <Text style={styles.slotText}>{number}</Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.centerCap}>
              <Text style={styles.centerCapText}>EU</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.ballOrbit, { transform: [{ rotate: ballRotation }] }]}>
          <Animated.View
            style={[
              styles.ball,
              {
                transform: [{ translateY: ballLaneOffset }],
              },
            ]}
          />
        </Animated.View>

        <View style={[styles.resultBadge, { borderColor: resultColor }]}>
          <Text style={[styles.resultText, { color: resultColor }]}>{settledResult ?? "--"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    width: 330,
    height: 330,
    alignItems: "center",
    justifyContent: "center",
  },
  outerRing: {
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 2,
    borderColor: rouletteTheme.colors.gold,
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  wheel: {
    width: 264,
    height: 264,
    borderRadius: 132,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.panelBorder,
    backgroundColor: rouletteTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  slotWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -10,
    marginTop: -32,
  },
  slot: {
    width: 20,
    height: 62,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  slotWinning: {
    borderColor: rouletteTheme.colors.gold,
    shadowColor: rouletteTheme.colors.gold,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  slotText: {
    color: rouletteTheme.colors.textPrimary,
    fontSize: 10,
    fontWeight: "900",
  },
  ballOrbit: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 18,
  },
  ball: {
    marginTop: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#1a1f2e",
    shadowColor: "#ffffff",
    shadowOpacity: 0.75,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  centerCap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: rouletteTheme.colors.gold,
    backgroundColor: rouletteTheme.colors.backgroundAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  centerCapText: {
    color: rouletteTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  resultBadge: {
    position: "absolute",
    bottom: 8,
    minWidth: 52,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 2,
    backgroundColor: rouletteTheme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
});
