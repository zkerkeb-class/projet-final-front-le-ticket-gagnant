import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
    DarkTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { casinoTheme } from "@/src/theme/casinoTheme";

export {
    ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "login",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  const professionalDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: casinoTheme.colors.bg,
      card: casinoTheme.colors.bgAlt,
      text: casinoTheme.colors.text,
      border: casinoTheme.colors.panelBorder,
      primary: casinoTheme.colors.cyan,
    },
  };

  return (
    <ThemeProvider value={colorScheme === "dark" ? professionalDarkTheme : professionalDarkTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: casinoTheme.colors.bgAlt },
          headerTintColor: casinoTheme.colors.text,
          headerTitleStyle: { fontWeight: "800" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="home"
          options={{
            title: "Casino Premium",
          }}
        />
        <Stack.Screen
          name="blackjack"
          options={{
            title: "Blackjack",
          }}
        />
        <Stack.Screen
          name="roulette"
          options={{
            title: "Roulette Électronique",
          }}
        />
        <Stack.Screen
          name="mines"
          options={{
            title: "Mines",
          }}
        />
        <Stack.Screen
          name="crash"
          options={{
            title: "Crash",
          }}
        />
        <Stack.Screen
          name="lucky-ladder"
          options={{
            title: "Lucky Ladder",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

