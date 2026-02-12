import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type ChipBalanceBadgeProps = {
  userId?: string;
  amount?: number;
  compact?: boolean;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const getApiBaseUrls = (): string[] => {
  if (API_BASE_URL) {
    return [API_BASE_URL.replace(/\/games\/blackjack\/?$/, "")];
  }

  if (Platform.OS === "android") {
    return ["http://10.0.2.2:3000/api", "http://localhost:3000/api", "http://127.0.0.1:3000/api"];
  }

  return ["http://localhost:3000/api", "http://127.0.0.1:3000/api"];
};

export default function ChipBalanceBadge({ userId, amount, compact = false }: ChipBalanceBadgeProps) {
  const [remoteAmount, setRemoteAmount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof amount === "number") {
      setRemoteAmount(null);
      return;
    }

    let cancelled = false;

    const loadBalance = async () => {
      const baseUrls = getApiBaseUrls();

      for (const baseUrl of baseUrls) {
        try {
          const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
          const response = await fetch(`${baseUrl}/users/balance${query}`);
          if (!response.ok) {
            continue;
          }

          const data = await response.json() as { chipBalance?: number };
          if (typeof data.chipBalance === "number") {
            if (!cancelled) {
              setRemoteAmount(data.chipBalance);
            }
            return;
          }
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setRemoteAmount(null);
      }
    };

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [amount, userId]);

  const displayAmount = useMemo(() => {
    const resolved = typeof amount === "number" ? amount : remoteAmount;
    if (typeof resolved !== "number") {
      return "--";
    }

    return resolved.toFixed(2);
  }, [amount, remoteAmount]);

  return (
    <View style={[styles.badge, compact ? styles.badgeCompact : null]}>
      <View style={styles.gloss} />
      <Text style={styles.label}>SOLDE</Text>
      <Text style={styles.value}>{displayAmount}</Text>
      <Text style={styles.unit}>jetons</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 144,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#37557e",
    backgroundColor: "#12243b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "flex-end",
    overflow: "hidden",
  },
  badgeCompact: {
    minWidth: 124,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  gloss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  label: {
    color: "#9eb7d9",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  value: {
    color: "#f3f7ff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  unit: {
    color: "#b7c6dd",
    fontSize: 11,
    fontWeight: "700",
  },
});
