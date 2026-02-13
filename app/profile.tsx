import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { authApi, ProfileResponse } from "@/src/services/authApi";
import { authStorage } from "@/src/services/authStorage";
import { casinoTheme } from "@/src/theme/casinoTheme";

const withAlpha = (hex: string, alpha: number): string => {
  const rgba = hex.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)$/i);
  if (rgba) {
    const red = Number.parseInt(rgba[1], 10);
    const green = Number.parseInt(rgba[2], 10);
    const blue = Number.parseInt(rgba[3], 10);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  const safeHex = hex.replace("#", "");
  const value = safeHex.length === 3
    ? safeHex.split("").map((char) => char + char).join("")
    : safeHex;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return `rgba(255,255,255,${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function ProfileScreen() {
  const router = useRouter();
  const authChecked = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      const token = await authStorage.getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const data = await authApi.getProfile(token);
      setProfile(data);
      setUsername(data.username);
      setEmail(data.email);
    } catch (error) {
      Alert.alert("Profil", error instanceof Error ? error.message : "Impossible de charger le profil.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    void loadProfile();
  }, [authChecked]);

  const handleSave = async () => {
    if (!profile) return;
    if (!username.trim() || !email.trim()) {
      Alert.alert("Erreur", "Username et email sont requis.");
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
        username: username.trim(),
        email: email.trim(),
      });

      setProfile(updated);
      await authStorage.setSession(token, {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        chipBalance: updated.chipBalance,
      });

      Alert.alert("Succès", "Profil mis à jour.");
    } catch (error) {
      Alert.alert("Mise à jour impossible", error instanceof Error ? error.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Supprimer le compte",
      "Cette action est définitive. Voulez-vous vraiment supprimer votre compte ?",
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
      Alert.alert("Compte supprimé", "Votre compte a bien été supprimé.");
      router.replace("/");
    } catch (error) {
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
        <Text style={styles.subtitle}>Gérez votre identité joueur et votre profil sécurisé.</Text>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Jetons</Text>
            <Text style={styles.statValue}>{Math.floor(profile?.chipBalance ?? 0)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ID</Text>
            <Text style={styles.statSmall}>{profile?.id.slice(0, 8)}...</Text>
          </View>
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

        <TouchableOpacity style={[styles.primaryButton, saving && styles.disabled]} disabled={saving} onPress={handleSave}>
          {saving ? <ActivityIndicator color="#17130a" /> : <Text style={styles.primaryButtonText}>Sauvegarder</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Retour</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.dangerButton, deleting && styles.disabled]} disabled={deleting} onPress={confirmDelete}>
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
    gap: 10,
    marginBottom: 4,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.32)",
    borderRadius: casinoTheme.radius.md,
    backgroundColor: "rgba(43, 40, 58, 0.82)",
    padding: 10,
  },
  statLabel: {
    color: "rgba(229, 220, 201, 0.76)",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    color: "#f1d5a4",
    fontSize: 22,
    fontWeight: "900",
  },
  statSmall: {
    color: "#efe8da",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  fieldLabel: {
    color: "rgba(229, 220, 201, 0.76)",
    fontWeight: "700",
    fontSize: 12,
    marginTop: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(217, 195, 160, 0.28)",
    borderRadius: casinoTheme.radius.md,
    paddingHorizontal: 14,
    color: "#f5efe3",
    backgroundColor: "rgba(239, 233, 222, 0.12)",
  },
  primaryButton: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: casinoTheme.radius.md,
    backgroundColor: "#d6ab62",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#17130a",
    fontWeight: "900",
    fontSize: 15,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: casinoTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(214, 188, 150, 0.32)",
    backgroundColor: "rgba(239, 233, 222, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#f1d5a4",
    fontWeight: "800",
    fontSize: 14,
  },
  dangerButton: {
    minHeight: 44,
    borderRadius: casinoTheme.radius.md,
    borderWidth: 1,
    borderColor: "rgba(202, 120, 111, 0.7)",
    backgroundColor: "rgba(93, 39, 43, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  dangerButtonText: {
    color: "#d89a93",
    fontWeight: "900",
    fontSize: 14,
  },
  disabled: {
    opacity: 0.7,
  },
});
