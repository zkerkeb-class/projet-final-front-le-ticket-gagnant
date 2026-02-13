import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";
import { getApiBaseUrls } from "@/src/services/apiBaseUrl";
import { authStorage } from "@/src/services/authStorage";

type ChipBalanceBadgeProps = {
  userId?: string;
  amount?: number;
  compact?: boolean;
  tiny?: boolean;
};

export default function ChipBalanceBadge({ userId, amount, compact = false, tiny = false }: ChipBalanceBadgeProps) {
  const [remoteAmount, setRemoteAmount] = useState<number | null>(null);

  const loadBalance = useCallback(async () => {
    if (typeof amount === "number") {
      return;
    }

    const baseUrls = getApiBaseUrls();
    const token = await authStorage.getToken();
    if (!token) {
      setRemoteAmount(null);
      return;
    }

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/users/balance`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          continue;
        }

        const data = await response.json() as { chipBalance?: number };
        if (typeof data.chipBalance === "number") {
          setRemoteAmount(data.chipBalance);
          return;
        }
      } catch {
        continue;
      }
    }

    setRemoteAmount(null);
  }, [amount, userId]);

  useEffect(() => {
    if (typeof amount === "number") {
      setRemoteAmount(null);
      return;
    }

    loadBalance();

    const interval = setInterval(() => {
      loadBalance();
    }, 2500);

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadBalance();
      }
    });

    const visibilityHandler = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadBalance();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, [amount, loadBalance]);

  const displayAmount = useMemo(() => {
    const resolved = typeof amount === "number" ? amount : remoteAmount;
    if (typeof resolved !== "number") {
      return "--";
    }

    return resolved.toFixed(2);
  }, [amount, remoteAmount]);

  return (
    <View style={[styles.badge, compact ? styles.badgeCompact : null, tiny ? styles.badgeTiny : null]}>
      <View style={[styles.gloss, tiny ? styles.glossTiny : null]} />
      <Text style={[styles.label, tiny ? styles.labelTiny : null]}>SOLDE</Text>
      <Text style={[styles.value, tiny ? styles.valueTiny : null]}>{displayAmount}</Text>
      {!tiny ? <Text style={[styles.unit, tiny ? styles.unitTiny : null]}>jetons</Text> : null}
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
  badgeTiny: {
    minWidth: 86,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderColor: "#2c4363",
    backgroundColor: "#0f1b2d",
  },
  gloss: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  glossTiny: {
    height: "100%",
    opacity: 0,
  },
  label: {
    color: "#9eb7d9",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  labelTiny: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  value: {
    color: "#f3f7ff",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  valueTiny: {
    fontSize: 13,
    lineHeight: 16,
  },
  unit: {
    color: "#b7c6dd",
    fontSize: 11,
    fontWeight: "700",
  },
  unitTiny: {
    fontSize: 9,
  },
});
