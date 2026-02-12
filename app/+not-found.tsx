import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { casinoTheme } from './casinoTheme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Page introuvable',
          headerStyle: { backgroundColor: casinoTheme.colors.bgAlt },
          headerTintColor: casinoTheme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Cette page n'existe pas</Text>
          <Text style={styles.subtitle}>Retourne à l'accueil du casino pour continuer à jouer.</Text>

          <Link href="/login" style={styles.link}>
            <Text style={styles.linkText}>Retour à la connexion</Text>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: casinoTheme.colors.bg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: casinoTheme.colors.panelBorder,
    borderRadius: casinoTheme.radius.lg,
    backgroundColor: casinoTheme.colors.panel,
    padding: 20,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: casinoTheme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: casinoTheme.colors.textMuted,
    textAlign: 'center',
  },
  link: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: casinoTheme.colors.cyan,
    borderRadius: casinoTheme.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(18, 54, 73, 0.45)',
  },
  linkText: {
    fontSize: 14,
    color: casinoTheme.colors.cyan,
    fontWeight: '800',
  },
});
