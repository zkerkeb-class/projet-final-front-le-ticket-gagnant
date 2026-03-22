import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { authStorage } from "@/src/services/authStorage";

export const useRedirectIfAuthenticated = (): boolean => {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const redirectIfAuthenticated = async () => {
      try {
        const session = await authStorage.getSession();
        if (session?.token) {
          router.replace(session.user
            ? {
                pathname: "/home",
                params: {
                  userId: session.user.id,
                  username: session.user.username,
                },
              }
            : "/home");
          return;
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    void redirectIfAuthenticated();

    return () => {
      mounted = false;
    };
  }, [router]);

  return checkingSession;
};
