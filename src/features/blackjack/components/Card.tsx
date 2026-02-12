import React from "react";
import { StyleSheet, Text, View } from "react-native";

type CardProps = {
  value: string;
  suit: "H" | "D" | "C" | "S";
};

const suitMap: Record<CardProps["suit"], string> = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠",
};

export default function Card({ value, suit }: CardProps) {
  const isRed = suit === "H" || suit === "D";
  const colorStyle = isRed ? styles.redText : styles.blackText;
  const symbol = suitMap[suit];

  return (
    <View style={styles.card}>
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
    </View>
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
    marginRight: 10,
    marginBottom: 8,
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
