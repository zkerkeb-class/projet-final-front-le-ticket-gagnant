import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import PremiumBackground from "@/src/components/PremiumBackground";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { authApi, AuthApiError, ProfileResponse } from "@/src/services/authApi";
import { authStorage } from "@/src/services/authStorage";
import { normalizeEmail, normalizeUsername, validateProfileInput } from "@/src/services/authValidation";
import { RescueBonusStatus, WalletSummaryResponse, WalletTransaction, walletApi } from "@/src/services/walletApi";
import { casinoTheme } from "@/src/theme/casinoTheme";

const formatTransactionLabel = (transaction: WalletTransaction): string => {
  switch (transaction.game) {
    case "WELCOME_BONUS":
      return "Bonus de bienvenue";
    case "RESCUE_BONUS":
      return "Bonus de secours";
    case "BLACKJACK":
      return "Blackjack";
    case "ROULETTE":
      return "Roulette";
    case "BACCARAT":
      return "Baccarat";
    case "CRASH":
      return "Crash";
    case "MINES":
      return "Mines";
    case "LUCKY_LADDER":
      return "Lucky Ladder";
    default:
      return transaction.game ?? "Portefeuille";
  }
};

const formatTransactionType = (transaction: WalletTransaction): string => {
  switch (transaction.type) {
    case "BET":
      return "Mise";
    case "WIN":
      return "Gain";
    case "DEPOSIT":
      return "Depot";
    case "WITHDRAWAL":
      return "Retrait";
    default:
      return transaction.type;
  }
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCooldown = (remainingMs: number): string => {
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
};

const getBonusHint = (bonus: RescueBonusStatus | null): string => {
  if (!bonus) {
    return "Chargement du bonus de secours.";
  }

  if (bonus.eligible) {
    return `Disponible maintenant: +${bonus.amount.toFixed(2)} jetons.`;
  }

  if (bonus.currentBalance > bonus.maxBalanceToClaim) {
    return `Disponible sous ${bonus.maxBalanceToClaim.toFixed(2)} jetons ou moins.`;
  }

  if (bonus.cooldownRemainingMs > 0) {
    return `Recharge dans ${formatCooldown(bonus.cooldownRemainingMs)}.`;
  }

  return "Bonus actuellement indisponible.";
};

export default function ProfileScreen() {
  const router = useRouter();
  const authChecked = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [wallet, setWallet] = useState<WalletSummaryResponse | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const displayedBalance = useMemo(() => {
    if (wallet) {
      return wallet.chipBalance;
    }

    return profile?.chipBalance ?? 0;
  }, [profile, wallet]);

  const syncStoredSession = useCallback(async (token: string, nextProfile: ProfileResponse, chipBalance: number) => {
    await authStorage.setSession(token, {
      id: nextProfile.id,
      username: nextProfile.username,
      email: nextProfile.email,
      chipBalance,
    });
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const token = await authStorage.getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const [profileData, walletData] = await Promise.all([
        authApi.getProfile(token),
        walletApi.getSummary(token),
      ]);

      const nextProfile: ProfileResponse = {
        ...profileData,
        chipBalance: walletData.chipBalance,
      };

      setProfile(nextProfile);
      setWallet(walletData);
      setUsername(nextProfile.username);
      setEmail(nextProfile.email);
      await syncStoredSession(token, nextProfile, walletData.chipBalance);
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        await authStorage.clearSession();
        Alert.alert("Session invalide", "Reconnectez-vous pour acceder a votre profil.");
        router.replace("/login");
        return;
      }

      Alert.alert("Profil", error instanceof Error ? error.message : "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  }, [router, syncStoredSession]);

  useEffect(() => {
    if (!authChecked) return;
    void loadProfile();
  }, [authChecked, loadProfile]);

  const handleSave = async () => {
    if (!profile) return;

    const validationError = validateProfileInput(username, email);
    if (validationError) {
      Alert.alert("Erreur", validationError);
      return;
    }

    try {
      setSaving(true);
      const token = await authStorage.getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const updated = await authApi.updateProfile(token, {
        username: normalizeUsername(username),
        email: normalizeEmail(email),
      });

      const nextProfile: ProfileResponse = {
        ...updated,
        chipBalance: wallet?.chipBalance ?? updated.chipBalance,
      };

      setProfile(nextProfile);
      setUsername(nextProfile.username);
      setEmail(nextProfile.email);
      await syncStoredSession(token, nextProfile, nextProfile.chipBalance);

      Alert.alert("Succes", "Profil mis a jour.");
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        await authStorage.clearSession();
        Alert.alert("Session invalide", "Reconnectez-vous pour continuer.");
        router.replace("/login");
        return;
      }

      Alert.alert("Mise a jour impossible", error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  };

  const handleClaimRescueBonus = async () => {
    try {
      setClaimingBonus(true);
      const token = await authStorage.getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const walletData = await walletApi.claimRescueBonus(token);
      setWallet(walletData);
      setProfile((current) => current ? { ...current, chipBalance: walletData.chipBalance } : current);
      await authStorage.updateChipBalance(walletData.chipBalance);

      Alert.alert("Bonus credite", `+${walletData.rescueBonus.amount.toFixed(2)} jetons ajoutes a votre portefeuille.`);
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        await authStorage.clearSession();
        router.replace("/login");
        return;
      }

      Alert.alert("Bonus indisponible", error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setClaimingBonus(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Supprimer le compte",
      "Cette action est definitive. Voulez-vous vraiment supprimer votre compte ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => void handleDelete() },
      ],
    );
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const token = await authStorage.getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      await authApi.deleteProfile(token);
      await authStorage.clearSession();
      Alert.alert("Compte supprime", "Votre compte a bien ete supprime.");
      router.replace("/");
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) {
        await authStorage.clearSession();
        router.replace("/login");
        return;
      }

      Alert.alert("Suppression impossible", error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setDeleting(false);
    }
  };

  if (!authChecked || loading) {
    return (
      <View style={styles.loaderWrap}>
        <PremiumBackground />
        <ActivityIndicator size="large" color={casinoTheme.colors.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <PremiumBackground />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Mon compte</Text>
          <Text style={styles.subtitle}>Gerez votre identite joueur, vos jetons et votre historique de jeu.</Text>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Jetons</Text>
              <Text style={styles.statValue}>{displayedBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ID</Text>
              <Text style={styles.statSmall}>{profile?.id ? `${profile.id.slice(0, 8)}...` : "--"}</Text>
            </View>
          </View>

          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <View>
                <Text style={styles.sectionTitle}>Bonus de secours</Text>
                <Text style={styles.sectionHint}>{getBonusHint(wallet?.rescueBonus ?? null)}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.bonusButton,
                  (!wallet?.rescueBonus.eligible || claimingBonus) && styles.disabledButton,
                ]}
                disabled={!wallet?.rescueBonus.eligible || claimingBonus}
                onPress={() => void handleClaimRescueBonus()}
              >
                {claimingBonus
                  ? <ActivityIndicator color="#17130a" />
                  : <Text style={styles.bonusButtonText}>Recuperer</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.walletCard}>
            <Text style={styles.sectionTitle}>Activite recente</Text>
            {wallet?.recentTransactions.length ? wallet.recentTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionRow}>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionGame}>{formatTransactionLabel(transaction)}</Text>
                  <Text style={styles.transactionType}>{`${formatTransactionType(transaction)} · ${formatTimestamp(transaction.createdAt)}`}</Text>
                </View>
                <Text style={[styles.transactionAmount, transaction.direction === "IN" ? styles.transactionIn : styles.transactionOut]}>
                  {`${transaction.direction === "IN" ? "+" : "-"}${transaction.amount.toFixed(2)}`}
                </Text>
              </View>
            )) : (
              <Text style={styles.emptyText}>Aucune transaction recente.</Text>
            )}
          </View>

          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            placeholder="Username"
            placeholderTextColor={casinoTheme.colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={casinoTheme.colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity style={[styles.primaryButton, saving && styles.disabledButton]} disabled={saving} onPress={handleSave}>
            {saving ? <ActivityIndicator color="#17130a" /> : <Text style={styles.primaryButtonText}>Sauvegarder</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Retour</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.dangerButton, deleting && styles.disabledButton]} disabled={deleting} onPress={confirmDelete}>
            {deleting ? <ActivityIndicator color={casinoTheme.colors.red} /> : <Text style={styles.dangerButtonText}>Supprimer mon compte</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    padding: 20,
    minHeight: "100%",
    justifyContent: "center",
  },
  loaderWrap: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#100f1a",
  },
  card: {
    borderRadius: casinoTheme.radius.xl,
    borderWidth: 1,
    borderColor: "rgba(210, 187, 151, 0.35)",
    backgroundColor: "rgba(23, 21, 35, 0.94)",
    padding: 18,
    gap: 10,
  },
  title: {
    color: "#f1d5a4",
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: "rgba(229, 220, 201, 0.84)",
    marginBottom: 6,
    fontSize: 14,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    borderRadius: casinoTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(120, 111, 92, 0.35)",
    backgroundColor: "rgba(34, 30, 48, 0.88)",
    padding: 14,
  },
  statLabel: {
    color: "rgba(215, 205, 191, 0.74)",
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: "#fff4da",
    fontSize: 24,
    fontWeight: "900",
  },
  statSmall: {
    color: "#f5ecdb",
    fontSize: 15,
    fontWeight: "700",
  },
  walletCard: {
    borderRadius: casinoTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(120, 111, 92, 0.35)",
    backgroundColor: "rgba(29, 26, 42, 0.88)",
    padding: 14,
    gap: 10,
  },
  walletHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: "#fff0c8",
    fontSize: 15,
    fontWeight: "800",
  },
  sectionHint: {
    color: "rgba(224, 216, 203, 0.8)",
    fontSize: 12,
    marginTop: 4,
  },
  bonusButton: {
    minWidth: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244, 196, 84, 0.9)",
    backgroundColor: "rgba(244, 196, 84, 0.95)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bonusButtonText: {
    color: "#201405",
    fontWeight: "900",
    fontSize: 13,
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  transactionMeta: {
    flex: 1,
    gap: 2,
  },
  transactionGame: {
    color: "#f5ecdb",
    fontSize: 14,
    fontWeight: "700",
  },
  transactionType: {
    color: "rgba(215, 205, 191, 0.72)",
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: "900",
  },
  transactionIn: {
    color: "#6de7a6",
  },
  transactionOut: {
    color: "#ff8b8b",
  },
  emptyText: {
    color: "rgba(224, 216, 203, 0.7)",
    fontSize: 13,
  },
  fieldLabel: {
    color: "#f0dec1",
    marginTop: 6,
    marginBottom: 2,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(198, 169, 124, 0.3)",
    backgroundColor: "rgba(14, 12, 22, 0.88)",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: "#f3c56f",
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#17130a",
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(200, 184, 157, 0.32)",
    backgroundColor: "rgba(35, 30, 48, 0.86)",
    paddingVertical: 13,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#f5ecdb",
    fontWeight: "800",
    fontSize: 14,
  },
  dangerButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.45)",
    backgroundColor: "rgba(70, 18, 18, 0.6)",
    paddingVertical: 13,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#ffb4b4",
    fontWeight: "800",
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
