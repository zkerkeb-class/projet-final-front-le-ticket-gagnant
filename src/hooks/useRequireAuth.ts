import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { authStorage } from "@/src/services/authStorage";

export const useRequireAuth = (): boolean => {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const guardInProgressRef = useRef(false);

  useEffect(() => {
    if (ready || guardInProgressRef.current) {
      return;
    }

    let mounted = true;
    guardInProgressRef.current = true;

    const guard = async () => {
      try {
        const token = await authStorage.getToken();

        if (!token) {
          await authStorage.clearSession();
          Alert.alert("Session expiree", "Veuillez vous reconnecter pour acceder a cette page.");
          router.replace("/login");
          return;
        }

        if (mounted) {
          setReady(true);
        }
      } catch {
        await authStorage.clearSession();
        Alert.alert("Session invalide", "Impossible de verifier la session. Reconnectez-vous.");
        router.replace("/login");
      } finally {
        guardInProgressRef.current = false;
      }
    };

    void guard();

    return () => {
      mounted = false;
    };
  }, [ready, router]);

  return ready;
};
