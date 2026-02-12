import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

type CardProps = {
  value: string;
  suit: "H" | "D" | "C" | "S";
  entryLane?: "dealer" | "player";
};

const suitMap: Record<CardProps["suit"], string> = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
};

export default function Card({ value, suit, entryLane = "player" }: CardProps) {
  const entryProgress = useRef(new Animated.Value(0)).current;
  const startTranslateX = 420;
  const startTranslateY = entryLane === "dealer" ? 96 : -112;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(70),
      Animated.timing(entryProgress, {
        toValue: 1,
        duration: 560,
        easing: Easing.bezier(0.19, 0.84, 0.28, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [entryProgress]);

  const isRed = suit === "H" || suit === "D";
  const colorStyle = isRed ? styles.redText : styles.blackText;
  const symbol = suitMap[suit];

  const animatedStyle = {
    opacity: entryProgress,
    zIndex: 3,
    transform: [
      {
        translateX: entryProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [startTranslateX, 0],
        }),
      },
      {
        translateY: entryProgress.interpolate({
          inputRange: [0, 0.45, 1],
          outputRange: [startTranslateY, startTranslateY - 20, 0],
        }),
      },
      {
        rotate: entryProgress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: ["9deg", "4deg", "0deg"],
        }),
      },
      {
        scale: entryProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <View style={styles.cornerTop}>
        <Text style={[styles.cornerValue, colorStyle]}>{value}</Text>
        <Text style={[styles.cornerSuit, colorStyle]}>{symbol}</Text>
      </View>

      <View style={styles.centerWrap}>
        <Text style={[styles.centerSuit, colorStyle]}>{symbol}</Text>
      </View>

      <View style={styles.cornerBottom}>
        <Text style={[styles.cornerValue, colorStyle]}>{value}</Text>
        <Text style={[styles.cornerSuit, colorStyle]}>{symbol}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 68,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7d7d7",
    backgroundColor: "#fff",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 7,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cornerTop: {
    alignSelf: "flex-start",
    alignItems: "center",
  },
  cornerBottom: {
    alignSelf: "flex-end",
    alignItems: "center",
    transform: [{ rotate: "180deg" }],
  },
  cornerValue: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  cornerSuit: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 14,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerSuit: {
    fontSize: 26,
    fontWeight: "800",
  },
  redText: {
    color: "#d32f2f",
  },
  blackText: {
    color: "#1f1f1f",
  },
});
