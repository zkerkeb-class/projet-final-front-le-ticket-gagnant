import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { rouletteTheme } from "../assets/theme";
import { BLACK_NUMBERS, RED_NUMBERS } from "../utils/payouts";

type RouletteWheelProps = {
  spinning: boolean;
  result: number | null;
};

const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const SEGMENT_ANGLE = 360 / EUROPEAN_WHEEL_ORDER.length;

function getResultColor(number: number | null) {
  if (number === null) return rouletteTheme.colors.textSecondary;
  if (number === 0) return rouletteTheme.colors.cyan;
  if (RED_NUMBERS.indexOf(number) !== -1) return rouletteTheme.colors.red;
  if (BLACK_NUMBERS.indexOf(number) !== -1) return rouletteTheme.colors.textPrimary;
  return rouletteTheme.colors.textSecondary;
}

export function RouletteWheel({ spinning, result }: RouletteWheelProps) {
  const { width } = useWindowDimensions();
  const rotorSpin = useRef(new Animated.Value(0)).current;
  const ballSpin = useRef(new Animated.Value(0)).current;
  const ballBounce = useRef(new Animated.Value(0)).current;
  const ballDrop = useRef(new Animated.Value(0)).current;
  const glossPulse = useRef(new Animated.Value(0)).current;
  const rotorIdleDrift = useRef(new Animated.Value(0)).current;
  const [lockAngle, setLockAngle] = useState(0);

  const resultColor = useMemo(() => getResultColor(result), [result]);
  const wheelSize = useMemo(() => {
    const available = width - 44;
    const clamped = Math.max(250, Math.min(334, available));
    return clamped;
  }, [width]);
  const wheelScale = wheelSize / 334;

  const rotorRotation = rotorSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "1820deg"],
  });

  const rotorIdleRotation = rotorIdleDrift.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "16deg"],
  });

  const ballRailRotation = ballSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-2620deg"],
  });

  const lockRailRotation = ballSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", `${-2620 + lockAngle}deg`],
  });

  const glossOpacity = glossPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.55],
  });

  const ballLift = ballBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const ballDropDepth = ballDrop.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  useEffect(() => {
    if (!spinning) return;

    rotorSpin.setValue(0);
    ballSpin.setValue(0);
    ballBounce.setValue(0);
    ballDrop.setValue(0);
    rotorIdleDrift.stopAnimation();

    Animated.timing(rotorSpin, {
      toValue: 1,
      duration: 2200,
      easing: Easing.bezier(0.15, 0.86, 0.18, 1),
      useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.timing(ballSpin, {
        toValue: 0.76,
        duration: 1350,
        easing: Easing.bezier(0.08, 0.92, 0.22, 1),
        useNativeDriver: true,
      }),
      Animated.timing(ballDrop, {
        toValue: 1,
        duration: 300,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ballSpin, {
        toValue: 1,
        duration: 400,
        easing: Easing.bezier(0.2, 0.14, 0.28, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [spinning, rotorSpin, ballSpin, ballBounce, ballDrop, rotorIdleDrift]);

  useEffect(() => {
    if (result === null) return;

    const index = EUROPEAN_WHEEL_ORDER.indexOf(result);
    const resolvedIndex = index >= 0 ? index : 0;
    setLockAngle(resolvedIndex * SEGMENT_ANGLE);

    if (spinning) return;

    ballBounce.setValue(0);
    Animated.sequence([
      Animated.timing(ballBounce, {
        toValue: 1,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(ballBounce, {
        toValue: 0,
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [result, spinning, ballBounce]);

  useEffect(() => {
    if (spinning) return;

    rotorIdleDrift.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotorIdleDrift, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(rotorIdleDrift, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [spinning, rotorIdleDrift]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glossPulse, {
          toValue: 1,
          duration: spinning ? 320 : 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glossPulse, {
          toValue: 0,
          duration: spinning ? 320 : 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    return () => pulse.stop();
  }, [spinning, glossPulse]);

  return (
    <View style={[styles.container, { width: wheelSize, height: wheelSize }]}> 
      <View style={[styles.baseStage, { transform: [{ scale: wheelScale }] }]}>
        <View style={styles.shadowHalo} />
        <Animated.View style={[styles.glossHalo, { opacity: glossOpacity }]} />

        <View style={styles.topPointer} />
        <View style={styles.topPointerCore} />

        <View style={styles.outerBowl}>
          <View style={styles.woodRing} />
          <View style={styles.goldRail} />
        </View>

        <Animated.View style={[styles.outerRail, { transform: [{ rotate: ballRailRotation }] }]}>
          <Animated.View
            style={[
              styles.ballCarrier,
              {
                transform: [{ translateY: ballLift }, { translateY: ballDropDepth }],
              },
            ]}
          >
            <View style={styles.ballTrail} />
            <View style={styles.ballCore} />
            <View style={styles.ballShine} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.outerRail, styles.lockRail, { transform: [{ rotate: lockRailRotation }] }]}>
          <View style={styles.lockMarker} />
        </Animated.View>

        <Animated.View style={[styles.rotor, { transform: [{ rotate: rotorRotation }, { rotate: rotorIdleRotation }] }]}>
          <View style={styles.woodTexture} />
          <View style={styles.woodTextureAlt} />
          <View style={styles.depthShadow} />
          <View style={styles.innerGoldRing} />
          <View style={styles.tickRing}>
            {EUROPEAN_WHEEL_ORDER.map((_, index) => {
              const angle = index * SEGMENT_ANGLE;
              return (
                <View
                  key={`tick-${index}`}
                  style={[
                    styles.tick,
                    {
                      transform: [{ rotate: `${angle}deg` }, { translateY: -98 }],
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.segmentRing}>
            {EUROPEAN_WHEEL_ORDER.map((n, index) => {
              const angle = index * SEGMENT_ANGLE;
              const cellColor =
                n === 0 ? "#0f6b4f" : RED_NUMBERS.indexOf(n) !== -1 ? "#8f122c" : "#111318";

              return (
                <View
                  key={n}
                  style={[
                    styles.segmentCell,
                    {
                      transform: [{ rotate: `${angle}deg` }, { translateY: -96 }, { rotate: `${-angle}deg` }],
                    },
                  ]}
                >
                  <View style={[styles.segmentPlate, { backgroundColor: cellColor }]}>
                    <Text style={styles.segmentText}>{n}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.centerCap}>
            <Text style={styles.centerText}>EUROPE</Text>
          </View>
        </Animated.View>

        <View style={[styles.resultBadge, { borderColor: resultColor }]}>
          <Text style={[styles.resultText, { color: resultColor }]}>{result ?? "--"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  baseStage: {
    width: 334,
    height: 334,
    alignItems: "center",
    justifyContent: "center",
  },
  shadowHalo: {
    position: "absolute",
    width: 316,
    height: 316,
    borderRadius: 158,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  glossHalo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255, 228, 170, 0.18)",
  },
  topPointer: {
    position: "absolute",
    top: 9,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderBottomWidth: 21,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#f0d18a",
    zIndex: 20,
  },
  topPointerCore: {
    position: "absolute",
    top: 26,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff6d2",
    zIndex: 20,
  },
  outerBowl: {
    position: "absolute",
    width: 318,
    height: 318,
    borderRadius: 159,
    alignItems: "center",
    justifyContent: "center",
  },
  woodRing: {
    position: "absolute",
    width: 318,
    height: 318,
    borderRadius: 159,
    backgroundColor: "#4e2f1d",
    borderWidth: 6,
    borderColor: "#2c1a10",
  },
  goldRail: {
    width: 286,
    height: 286,
    borderRadius: 143,
    borderWidth: 2,
    borderColor: "#e6bc62",
    backgroundColor: "rgba(22, 14, 8, 0.72)",
  },
  outerRail: {
    position: "absolute",
    width: 282,
    height: 282,
    borderRadius: 141,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  lockRail: {
    width: 276,
    height: 276,
    borderRadius: 138,
  },
  lockMarker: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 18,
    backgroundColor: "#f1d99b",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  ballCarrier: {
    marginTop: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  ballTrail: {
    position: "absolute",
    width: 12,
    height: 20,
    borderRadius: 10,
    top: -1,
    backgroundColor: "rgba(255,255,255,0.22)",
    transform: [{ translateY: -9 }],
  },
  ballCore: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#f5f0e7",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
    shadowColor: "#ffffff",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  ballShine: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    top: 3,
    left: 3,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  rotor: {
    width: 268,
    height: 268,
    borderRadius: 134,
    borderWidth: 2,
    borderColor: "#e6bc62",
    backgroundColor: "#3d2415",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  woodTexture: {
    position: "absolute",
    width: 268,
    height: 268,
    borderRadius: 134,
    backgroundColor: "rgba(133, 79, 47, 0.34)",
  },
  woodTextureAlt: {
    position: "absolute",
    width: 252,
    height: 252,
    borderRadius: 126,
    backgroundColor: "rgba(38, 22, 13, 0.35)",
  },
  depthShadow: {
    position: "absolute",
    width: 268,
    height: 268,
    borderRadius: 134,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  innerGoldRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: "#eacb82",
  },
  tickRing: {
    width: 248,
    height: 248,
    borderRadius: 124,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  tick: {
    position: "absolute",
    width: 2,
    height: 10,
    borderRadius: 2,
    backgroundColor: "#f1d59a",
  },
  segmentRing: {
    width: 248,
    height: 248,
    borderRadius: 124,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentCell: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentPlate: {
    minWidth: 22,
    height: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#f0c97d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  segmentText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
    fontFamily: "serif",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 0 },
  },
  centerCap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: "#f0d189",
    backgroundColor: "#a6762e",
    alignItems: "center",
    justifyContent: "center",
    ...rouletteTheme.shadows.gold,
  },
  centerText: {
    color: "#fff6e5",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    fontFamily: "serif",
  },
  resultBadge: {
    position: "absolute",
    right: 10,
    bottom: 12,
    minWidth: 62,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(20, 13, 8, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  resultText: {
    fontWeight: "900",
    fontSize: 20,
  },
});
