import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import { authStorage } from "@/src/services/authStorage";

export const useRequireAuth = (): boolean => {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const guard = async () => {
      try {
        const token = await authStorage.getToken();

        if (!token) {
          Alert.alert("Session expirée", "Veuillez vous reconnecter pour accéder à cette page.");
          router.replace("/login");
          return;
        }

        if (mounted) {
          setReady(true);
        }
      } catch {
        Alert.alert("Session invalide", "Impossible de vérifier la session. Reconnectez-vous.");
        router.replace("/login");
      }
    };

    void guard();

    return () => {
      mounted = false;
    };
  }, [router]);

  return ready;
};
