import { PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, View, ViewStyle } from "react-native";

type PremiumBackgroundProps = PropsWithChildren<{
  contentStyle?: ViewStyle;
}>;

const PREMIUM_BG_IMAGE =
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1800&q=80";

export default function PremiumBackground({ children, contentStyle }: PremiumBackgroundProps) {
  return (
    <View style={styles.root}>
      <ImageBackground source={{ uri: PREMIUM_BG_IMAGE }} resizeMode="cover" style={styles.image}>
        <View style={styles.overlayStrong} />
        <View style={styles.overlaySoft} />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    flex: 1,
  },
  overlayStrong: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 9, 16, 0.5)",
  },
  overlaySoft: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(48, 35, 77, 0.08)",
  },
  content: {
    flex: 1,
  },
});
