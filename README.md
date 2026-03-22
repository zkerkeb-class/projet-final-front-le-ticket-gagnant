# Le Ticket Gagnant

## Video de presentation

https://www.youtube.com/watch?v=cNSCr_I2vnk

Projet academique de casino social realise avec Expo Router, React Native et TypeScript.

## Objectif

L'application propose un espace authentifie avec plusieurs mini-jeux:

- Blackjack
- Roulette
- Crash
- Mines
- Lucky Ladder
- Poker Texas Hold'em
- Baccarat

## Perimetre principal

Le livrable principal est l'application Expo situee dans:

- `app/`
- `src/`

Les dossiers suivants sont conserves comme prototypes ou versions annexes et ne constituent pas le point d'entree principal du rendu:

- `casino-web/`
- `poker-pro/`
- `roulette-pro/`

## Prerequis

- Node.js 20+ recommande
- npm
- backend du projet lance sur le port `3000`

Dans ce workspace, le backend correspondant est present dans le depot voisin:

- `../projet-final-back-le-ticket-gagnant`

## Installation

1. Installer les dependances:

```bash
npm install
```

2. Creer le fichier d'environnement a partir de l'exemple:

```bash
copy .env.example .env
```

3. Verifier la variable API:

- `EXPO_PUBLIC_API_URL=http://localhost:3000/api` pour web, emulateur ou backend local
- pour un telephone physique sur le meme reseau, remplacer `localhost` par l'IP LAN de la machine qui heberge le backend

## Lancement

```bash
npm run start
```

Lancer aussi:

- `npm run web` pour la version web
- `npm run android` pour Android
- `npm run ios` pour iOS

## Verification qualite

Les verifications suivantes doivent passer avant rendu:

```bash
npm run lint
npm run typecheck
```

## Structure utile

- `app/`: routes Expo Router
- `src/features/`: ecrans et logique des jeux
- `src/services/`: auth, session, base URL API
- `src/components/`: composants partages
- `assets/`: icones, splash, polices

## Notes de rendu academique

- Le fichier `.env` local ne doit pas contenir d'IP personnelle ou de donnees machine-specifiques dans le depot final.
- Le projet a ete verifie avec `lint` et `typecheck`.
- Le backend requis pour l'authentification et les jeux connectes est present dans le workspace via `../projet-final-back-le-ticket-gagnant`.
