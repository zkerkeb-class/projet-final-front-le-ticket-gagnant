import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ChipBalanceBadge from "@/src/components/ChipBalanceBadge";
import { casinoTheme } from "@/src/theme/casinoTheme";

type Card = {
  rank: string;
  suit: "♠" | "♥" | "♦" | "♣";
  value: number;
};

type Player = {
  id: number;
  isUser: boolean;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  folded: boolean;
  status: string;
};

type HandScore = {
  category: number;
  tiebreak: number[];
};

const FALLBACK_USER_ID = process.env.EXPO_PUBLIC_USER_ID ?? "";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const REQUEST_TIMEOUT_MS = 9000;
const TURN_SECONDS = 12;
const STREETS = ["Pré-flop", "Flop", "Turn", "River", "Showdown"] as const;
const AI_NAMES = ["Viper", "Orion", "Nova", "Blaze", "Kronos", "Echo", "Lyra", "Rogue"];
const HAND_NAMES = [
  "Carte haute",
  "Paire",
  "Double paire",
  "Brelan",
  "Quinte",
  "Couleur",
  "Full",
  "Carré",
  "Quinte flush",
];

const getApiBaseUrls = (): string[] => {
  if (API_BASE_URL) {
    return [API_BASE_URL];
  }

  if (Platform.OS === "android") {
    return ["http://10.0.2.2:3000/api", "http://localhost:3000/api", "http://127.0.0.1:3000/api"];
  }

  return ["http://localhost:3000/api", "http://127.0.0.1:3000/api"];
};

const newDeck = (): Card[] => {
  const suits: Card["suit"][] = ["♠", "♥", "♦", "♣"];
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit, value: rank === "A" ? 14 : rank === "K" ? 13 : rank === "Q" ? 12 : rank === "J" ? 11 : Number(rank) });
    }
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

const withAlpha = (hex: string, alpha: number): string => {
  const safeHex = hex.replace("#", "");
  const value = safeHex.length === 3 ? safeHex.split("").map((char) => char + char).join("") : safeHex;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return `rgba(255,255,255,${alpha})`;
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export default function PokerScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const routeUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const resolvedUserId = routeUserId ?? FALLBACK_USER_ID;

  const [lobbyAiCount, setLobbyAiCount] = useState(5);
  const [players, setPlayers] = useState<Player[]>([]);
  const [board, setBoard] = useState<Card[]>([]);
  const [phase, setPhase] = useState<number>(0);
  const [pot, setPot] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(40);
  const [raiseTo, setRaiseTo] = useState<number>(80);
  const [handNumber, setHandNumber] = useState<number>(1);
  const [statusText, setStatusText] = useState<string>("Configurez la table puis démarrez la partie.");
  const [started, setStarted] = useState(false);
  const [awaitingUser, setAwaitingUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activePlayerId, setActivePlayerId] = useState<number | null>(null);
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(TURN_SECONDS);

  const deckRef = useRef<Card[]>([]);
  const userHandStartRef = useRef<number>(0);
  const turnOrderRef = useRef<number[]>([]);
  const turnCursorRef = useRef<number>(0);
  const turnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiActionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTokenRef = useRef<number>(0);

  const playersRef = useRef<Player[]>([]);
  const boardRef = useRef<Card[]>([]);
  const phaseRef = useRef<number>(0);
  const potRef = useRef<number>(0);
  const currentBetRef = useRef<number>(40);
  const handNumberRef = useRef<number>(1);
  const tableOrderRef = useRef<number[]>([]);

  const clearTurnTimers = useCallback(() => {
    if (turnTimerRef.current) {
      clearTimeout(turnTimerRef.current);
      turnTimerRef.current = null;
    }

    if (turnTickRef.current) {
      clearInterval(turnTickRef.current);
      turnTickRef.current = null;
    }

    if (aiActionRef.current) {
      clearTimeout(aiActionRef.current);
      aiActionRef.current = null;
    }
  }, []);

  const syncTableState = useCallback((next: {
    players?: Player[];
    board?: Card[];
    phase?: number;
    pot?: number;
    currentBet?: number;
  }) => {
    if (next.players) {
      playersRef.current = next.players;
      setPlayers(next.players);
    }

    if (next.board) {
      boardRef.current = next.board;
      setBoard(next.board);
    }

    if (typeof next.phase === "number") {
      phaseRef.current = next.phase;
      setPhase(next.phase);
    }

    if (typeof next.pot === "number") {
      potRef.current = next.pot;
      setPot(next.pot);
    }

    if (typeof next.currentBet === "number") {
      currentBetRef.current = next.currentBet;
      setCurrentBet(next.currentBet);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTurnTimers();
    };
  }, [clearTurnTimers]);

  const user = useMemo(() => players.find((player) => player.isUser), [players]);
  const canAct = started && awaitingUser && Boolean(user) && !user?.folded;

  const apiCall = useCallback(async (path: string, payload?: Record<string, unknown>) => {
    const baseUrls = getApiBaseUrls();

    for (const baseUrl of baseUrls) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`${baseUrl}${path}`, {
          method: payload ? "POST" : "GET",
          headers: { "Content-Type": "application/json" },
          body: payload ? JSON.stringify(payload) : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          continue;
        }

        return await response.json();
      } catch {
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error("API indisponible");
  }, []);

  const persistDelta = useCallback(async (delta: number) => {
    if (!resolvedUserId || delta === 0) {
      return;
    }

    setSyncing(true);
    try {
      await apiCall("/games/poker/settle", {
        userId: resolvedUserId,
        amount: delta,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur de synchronisation poker.";
      Alert.alert("Sync Poker", message);
    } finally {
      setSyncing(false);
    }
  }, [apiCall, resolvedUserId]);

  const startTable = useCallback(async () => {
    try {
      setLoading(true);

      let startingChips = 3000;
      if (resolvedUserId) {
        try {
          const balance = await apiCall(`/users/balance?userId=${encodeURIComponent(resolvedUserId)}`) as { chipBalance?: number };
          if (typeof balance.chipBalance === "number") {
            startingChips = Math.max(0, Math.floor(balance.chipBalance));
          }
        } catch {
          setStatusText("API indisponible: démarrage en mode local avec solde temporaire.");
        }
      }

      const tablePlayers: Player[] = [];
      tablePlayers.push({
        id: 0,
        isUser: true,
        name: "Vous",
        chips: startingChips,
        cards: [],
        bet: 0,
        folded: false,
        status: "",
      });

      for (let i = 0; i < lobbyAiCount; i += 1) {
        tablePlayers.push({
          id: i + 1,
          isUser: false,
          name: AI_NAMES[i % AI_NAMES.length],
          chips: Math.floor(2200 + Math.random() * 1800),
          cards: [],
          bet: 0,
          folded: false,
          status: "",
        });
      }

      playersRef.current = tablePlayers;
      tableOrderRef.current = tablePlayers.map((player) => player.id);
      setPlayers(tablePlayers);
      setStarted(true);
      setHandNumber(1);
      handNumberRef.current = 1;
      launchNewHand(tablePlayers, 1);
    } catch (error) {
      Alert.alert("Erreur", error instanceof Error ? error.message : "Impossible de lancer la table.");
    } finally {
      setLoading(false);
    }
  }, [apiCall, lobbyAiCount, resolvedUserId]);

  const launchNewHand = useCallback((basePlayers: Player[], nextHandNumber: number) => {
    clearTurnTimers();

    if (basePlayers.filter((player) => player.chips > 0).length < 2) {
      setStatusText("Partie terminée : il ne reste plus assez de joueurs en jetons.");
      setAwaitingUser(false);
      setActivePlayerId(null);
      return;
    }

    const deck = newDeck();
    deckRef.current = deck;

    const resetPlayers = basePlayers.map((player) => ({
      ...player,
      cards: [] as Card[],
      bet: 0,
      folded: player.chips <= 0,
      status: player.chips <= 0 ? "Hors-jeu" : "",
    }));

    for (let round = 0; round < 2; round += 1) {
      for (const player of resetPlayers) {
        if (!player.folded) {
          const card = deckRef.current.pop();
          if (card) player.cards.push(card);
        }
      }
    }

    const smallBlindPlayer = resetPlayers.find((player) => !player.isUser && !player.folded) ?? resetPlayers[0];
    const bigBlindPlayer = resetPlayers.find((player) => !player.isUser && !player.folded && player.id !== smallBlindPlayer.id) ?? resetPlayers[0];

    postBlind(smallBlindPlayer, 20, "SB");
    postBlind(bigBlindPlayer, 40, "BB");

    const nextPot = resetPlayers.reduce((sum, player) => sum + player.bet, 0);

    syncTableState({
      players: [...resetPlayers],
      board: [],
      phase: 0,
      pot: nextPot,
      currentBet: 40,
    });

    setRaiseTo(80);
    setHandNumber(nextHandNumber);
    handNumberRef.current = nextHandNumber;
    setStatusText(`Main #${nextHandNumber} · Pré-flop. À vous de jouer.`);
    setAwaitingUser(false);
    setActivePlayerId(null);
    setTurnSecondsLeft(TURN_SECONDS);

    const currentUser = resetPlayers.find((player) => player.isUser);
    userHandStartRef.current = currentUser?.chips ?? 0;

    startStreetRound([...resetPlayers], 0, [], nextPot, 40);
  }, [clearTurnTimers, syncTableState]);

  const postBlind = (player: Player, amount: number, label: string) => {
    const paid = Math.min(player.chips, amount);
    player.chips -= paid;
    player.bet += paid;
    player.status = `${label} ${paid}`;
  };

  const finishHand = useCallback(async (basePlayers: Player[], message: string, finalPot: number, early: boolean) => {
    clearTurnTimers();
    const cleared = basePlayers.map((player) => ({ ...player, bet: 0 }));

    syncTableState({
      players: cleared,
      phase: 4,
      pot: 0,
      currentBet: 0,
    });

    setRaiseTo(40);
    setAwaitingUser(false);
    setActivePlayerId(null);
    setTurnSecondsLeft(TURN_SECONDS);
    setStatusText(message);

    const userEnd = cleared.find((player) => player.isUser)?.chips ?? 0;
    const delta = userEnd - userHandStartRef.current;
    if (delta !== 0) {
      await persistDelta(delta);
    }

    if (!early) {
      const contenders = cleared.filter((player) => !player.folded);
      for (const player of contenders) {
        player.status = player.status || "Showdown";
      }
      syncTableState({ players: [...cleared] });
    }

    const nextHand = handNumberRef.current + 1;
    setHandNumber(nextHand);
    handNumberRef.current = nextHand;

    setTimeout(() => {
      launchNewHand(cleared, nextHand);
    }, 2100);

    void finalPot;
  }, [clearTurnTimers, launchNewHand, persistDelta, syncTableState]);

  const doShowdown = useCallback((basePlayers: Player[], currentPot: number, boardCards: Card[]) => {
    const contenders = basePlayers.filter((player) => !player.folded);
    if (!contenders.length) {
      finishHand(basePlayers, "Main terminée.", currentPot, false);
      return;
    }

    let winners = [contenders[0]];
    let best = evaluateBestOfSeven([...contenders[0].cards, ...boardCards]);

    for (let i = 1; i < contenders.length; i += 1) {
      const score = evaluateBestOfSeven([...contenders[i].cards, ...boardCards]);
      const cmp = compareHandScores(score, best);
      if (cmp > 0) {
        best = score;
        winners = [contenders[i]];
      } else if (cmp === 0) {
        winners.push(contenders[i]);
      }
    }

    const share = Math.floor(currentPot / winners.length);
    let remainder = currentPot - share * winners.length;

    for (const winner of winners) {
      const extra = remainder > 0 ? 1 : 0;
      winner.chips += share + extra;
      winner.status = winners.length > 1 ? `Split ${share + extra}` : `Gagne ${currentPot}`;
      remainder -= extra;
    }

    const handName = HAND_NAMES[best.category] ?? "Main";
    const message = winners.length === 1
      ? `${winners[0].name} gagne avec ${handName}.`
      : `Pot partagé (${handName}).`;

    finishHand(basePlayers, message, currentPot, false);
  }, [finishHand]);

  const startStreetRound = useCallback((streetPlayers: Player[], streetPhase: number, streetBoard: Card[], streetPot: number, streetCurrentBet: number) => {
    const userId = streetPlayers.find((player) => player.isUser)?.id ?? 0;
    const actingIds = new Set(
      streetPlayers
        .filter((player) => !player.folded && player.chips > 0)
        .map((player) => player.id),
    );

    const orderedTable = tableOrderRef.current.length
      ? tableOrderRef.current.filter((id) => streetPlayers.some((player) => player.id === id))
      : streetPlayers.map((player) => player.id);

    const userIndex = orderedTable.indexOf(userId);
    const rotatedOrder = userIndex >= 0
      ? [...orderedTable.slice(userIndex), ...orderedTable.slice(0, userIndex)]
      : orderedTable;

    turnOrderRef.current = rotatedOrder.filter((id) => actingIds.has(id));
    turnCursorRef.current = 0;
    turnTokenRef.current += 1;

    const runNextTurn = () => {
      const playersSnapshot = playersRef.current.map((player) => ({ ...player, cards: [...player.cards] }));
      const currentOrder = turnOrderRef.current;

      if (currentOrder.length === 0 || turnCursorRef.current >= currentOrder.length) {
        const contenders = playersSnapshot.filter((player) => !player.folded && (player.chips > 0 || player.bet > 0));
        if (contenders.length <= 1) {
          const winner = contenders[0];
          if (winner) {
            winner.chips += potRef.current;
            winner.status = `Gagne ${potRef.current}`;
          }
          finishHand(playersSnapshot, winner ? `${winner.name} remporte le pot.` : "Main terminée.", potRef.current, true);
          return;
        }

        if (streetPhase >= 3) {
          doShowdown(playersSnapshot, potRef.current, boardRef.current);
          return;
        }

        const nextPhase = streetPhase + 1;
        const updatedBoard = [...boardRef.current];
        if (nextPhase === 1) {
          updatedBoard.push(...drawCards(3));
        } else {
          updatedBoard.push(...drawCards(1));
        }

        const resetPlayers = playersSnapshot.map((player) => ({
          ...player,
          bet: 0,
          status: player.folded ? player.status : "",
        }));

        syncTableState({
          players: resetPlayers,
          board: updatedBoard,
          phase: nextPhase,
          pot: potRef.current,
          currentBet: 0,
        });

        setRaiseTo(40);
        setStatusText(`${STREETS[nextPhase]} · Nouveau tour de parole.`);

        setTimeout(() => {
          startStreetRound(resetPlayers, nextPhase, updatedBoard, potRef.current, 0);
        }, 350);
        return;
      }

      const activeId = currentOrder[turnCursorRef.current];
      const active = playersSnapshot.find((player) => player.id === activeId);

      if (!active || active.folded || active.chips <= 0) {
        turnCursorRef.current += 1;
        runNextTurn();
        return;
      }

      const token = turnTokenRef.current;
      clearTurnTimers();

      setActivePlayerId(active.id);
      setTurnSecondsLeft(TURN_SECONDS);

      for (const player of playersSnapshot) {
        if (player.id === active.id) {
          player.status = "Parle...";
        } else if (!player.folded && player.status === "Parle...") {
          player.status = "";
        }
      }
      syncTableState({ players: playersSnapshot });

      const toCall = Math.max(0, currentBetRef.current - active.bet);

      setAwaitingUser(active.isUser);
      setStatusText(active.isUser
        ? `C'est à vous de jouer (${TURN_SECONDS}s).`
        : `${active.name} réfléchit...`);

      turnTickRef.current = setInterval(() => {
        setTurnSecondsLeft((value) => {
          if (value <= 1) {
            return 0;
          }
          return value - 1;
        });
      }, 1000);

      const resolveTurn = (action: "FOLD" | "CALL" | "RAISE") => {
        if (token !== turnTokenRef.current) {
          return;
        }

        clearTurnTimers();

        const nextPlayers = playersRef.current.map((player) => ({ ...player, cards: [...player.cards] }));
        const target = nextPlayers.find((player) => player.id === active.id);
        if (!target) {
          turnCursorRef.current += 1;
          runNextTurn();
          return;
        }

        if (action === "FOLD") {
          target.folded = true;
          target.status = "Fold";
        } else if (action === "RAISE") {
          const desired = Math.max(currentBetRef.current + 40, raiseTo);
          const toPay = Math.max(0, desired - target.bet);
          const paid = Math.min(toPay, target.chips);
          target.chips -= paid;
          target.bet += paid;
          target.status = paid <= 0 ? "Check" : `Raise ${target.bet}`;
          currentBetRef.current = Math.max(currentBetRef.current, target.bet);
        } else {
          const callAmount = Math.max(0, currentBetRef.current - target.bet);
          const paid = Math.min(callAmount, target.chips);
          target.chips -= paid;
          target.bet += paid;
          target.status = callAmount === 0 ? "Check" : `Call ${paid}`;
        }

        const updatedPot = nextPlayers.reduce((sum, player) => sum + player.bet, 0);
        syncTableState({
          players: nextPlayers,
          pot: updatedPot,
          currentBet: currentBetRef.current,
        });

        turnCursorRef.current += 1;
        setAwaitingUser(false);
        setActivePlayerId(null);
        setTurnSecondsLeft(TURN_SECONDS);

        setTimeout(() => {
          runNextTurn();
        }, 220);
      };

      if (active.isUser) {
        userActionResolverRef.current = resolveTurn;

        turnTimerRef.current = setTimeout(() => {
          const timeoutAction: "CALL" | "FOLD" = toCall > 0 && active.chips <= 0 ? "FOLD" : "CALL";
          setStatusText("Temps écoulé: action automatique.");
          resolveTurn(timeoutAction);
        }, TURN_SECONDS * 1000);

        return;
      }

      aiActionRef.current = setTimeout(() => {
        const foldChance = streetPhase === 0 ? 0.14 : 0.22;
        const canRaise = active.chips > toCall + 40;
        const decision = toCall > 0 && Math.random() < foldChance
          ? "FOLD"
          : canRaise && Math.random() < 0.2
            ? "RAISE"
            : "CALL";

        resolveTurn(decision);
      }, randomInt(1200, 2600));

      turnTimerRef.current = setTimeout(() => {
        resolveTurn(toCall > 0 ? "FOLD" : "CALL");
      }, TURN_SECONDS * 1000);
    };

    runNextTurn();
  }, [clearTurnTimers, doShowdown, finishHand, raiseTo, syncTableState]);

  const userActionResolverRef = useRef<((action: "FOLD" | "CALL" | "RAISE") => void) | null>(null);

  const applyUserAction = (action: "FOLD" | "CALL" | "RAISE") => {
    if (!canAct) return;
    userActionResolverRef.current?.(action);
  };

  const drawCards = (count: number): Card[] => {
    const cards: Card[] = [];
    for (let i = 0; i < count; i += 1) {
      const card = deckRef.current.pop();
      if (card) cards.push(card);
    }
    return cards;
  };

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    potRef.current = pot;
  }, [pot]);

  useEffect(() => {
    currentBetRef.current = currentBet;
  }, [currentBet]);

  const seatPositions = useMemo(() => {
    const order = tableOrderRef.current.length
      ? tableOrderRef.current
      : players.map((player) => player.id);

    const orderedPlayers = order
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => player !== undefined);

    if (!orderedPlayers.length) {
      return [] as Array<{ player: Player; left: `${number}%`; top: `${number}%` }>;
    }

    const userIndex = orderedPlayers.findIndex((player) => player.isUser);
    const rotationStart = userIndex >= 0 ? userIndex : 0;
    const aroundTable = [
      ...orderedPlayers.slice(rotationStart),
      ...orderedPlayers.slice(0, rotationStart),
    ];

    const count = aroundTable.length;
    const startDeg = 90;
    const stepDeg = 360 / Math.max(count, 1);

    return aroundTable.map((player, index) => {
      const angleDeg = startDeg + index * stepDeg;
      const angle = (angleDeg * Math.PI) / 180;

      const radiusX = player.isUser ? 40 : 43;
      const radiusY = player.isUser ? 36 : 34;

      return {
        player,
        left: `${50 + radiusX * Math.cos(angle)}%` as `${number}%`,
        top: `${50 + radiusY * Math.sin(angle)}%` as `${number}%`,
      };
    });
  }, [players]);

  const renderCard = (card?: Card, hidden?: boolean, big?: boolean) => {
    if (!card || hidden) {
      return <View style={[styles.card, big ? styles.cardBig : null, styles.cardBack]} />;
    }

    const red = card.suit === "♥" || card.suit === "♦";
    return (
      <View style={[styles.card, big ? styles.cardBig : null]}>
        <Text style={[styles.cardText, big ? styles.cardTextBig : null, red ? styles.cardTextRed : null]}>{`${card.rank}${card.suit}`}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!started ? (
        <View style={styles.lobbyWrap}>
          <View style={styles.lobbyCard}>
            <Text style={styles.lobbyTag}>PREMIUM TABLE</Text>
            <Text style={styles.lobbyTitle}>Texas Hold'em Pro</Text>
            <Text style={styles.lobbySubtitle}>Choisissez le nombre d'adversaires IA puis asseyez-vous à la table.</Text>

            <View style={styles.aiRow}>
              <Pressable style={styles.aiButton} onPress={() => setLobbyAiCount((v) => Math.max(2, v - 1))}>
                <Text style={styles.aiButtonText}>-</Text>
              </Pressable>
              <Text style={styles.aiValue}>{lobbyAiCount} IA</Text>
              <Pressable style={styles.aiButton} onPress={() => setLobbyAiCount((v) => Math.min(8, v + 1))}>
                <Text style={styles.aiButtonText}>+</Text>
              </Pressable>
            </View>

            <Pressable style={styles.ctaButton} onPress={startTable} disabled={loading}>
              {loading ? <ActivityIndicator color="#24180b" /> : <Text style={styles.ctaText}>S'ASSEOIR À LA TABLE</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>Texas Hold'em Pro</Text>
              <Text style={styles.headerSubtitle}>{`Main #${handNumber} · ${STREETS[phase]}`}</Text>
            </View>
            <ChipBalanceBadge userId={resolvedUserId} amount={user?.chips} compact />
          </View>

          <View style={styles.tableWrap}>
            <View style={styles.felt} />
            <View style={styles.boardWrap}>
              <Text style={styles.potLabel}>Pot total</Text>
              <Text style={styles.potValue}>{pot}</Text>
              <View style={styles.boardCards}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <View key={`board-${idx}`}>{renderCard(board[idx], false)}</View>
                ))}
              </View>
            </View>

            {seatPositions.map((seat) => (
              <View
                key={seat.player.id}
                style={[
                  styles.seat,
                  seat.player.isUser ? styles.userSeat : null,
                  activePlayerId === seat.player.id ? styles.seatActive : null,
                  { left: seat.left, top: seat.top },
                ]}
              >
                <View style={styles.seatPlate}>
                  <View style={styles.seatAvatar} />
                  <View style={styles.seatMeta}>
                    <Text style={styles.seatName}>{seat.player.name}</Text>
                    <Text style={styles.seatStack}>{`${seat.player.chips} jetons`}</Text>
                    <Text style={styles.seatStatus}>{seat.player.status}</Text>
                  </View>
                </View>
                {activePlayerId === seat.player.id ? (
                  <View style={styles.turnBarTrack}>
                    <View
                      style={[
                        styles.turnBarFill,
                        { width: `${Math.max(0, Math.min(100, (turnSecondsLeft / TURN_SECONDS) * 100))}%` as `${number}%` },
                      ]}
                    />
                  </View>
                ) : null}
                <View style={styles.holeCards}>
                  {renderCard(seat.player.cards[0], !seat.player.isUser && phase < 4, seat.player.isUser)}
                  {renderCard(seat.player.cards[1], !seat.player.isUser && phase < 4, seat.player.isUser)}
                </View>
                {seat.player.isUser ? <Text style={styles.userBetText}>{`Mise: ${seat.player.bet}`}</Text> : null}
              </View>
            ))}
          </View>

          <View style={styles.actionBar}>
            <Text style={styles.statusText}>{statusText}</Text>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, styles.foldBtn, !canAct ? styles.disabledBtn : null]}
                onPress={() => applyUserAction("FOLD")}
                disabled={!canAct}
              >
                <Text style={styles.actionBtnText}>Se Coucher</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.callBtn, !canAct ? styles.disabledBtn : null]}
                onPress={() => applyUserAction("CALL")}
                disabled={!canAct}
              >
                <Text style={styles.actionBtnText}>{currentBet > (user?.bet ?? 0) ? `Suivre (${Math.max(0, currentBet - (user?.bet ?? 0))})` : "Parole"}</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, styles.raiseBtn, !canAct ? styles.disabledBtn : null]}
                onPress={() => applyUserAction("RAISE")}
                disabled={!canAct || (user?.chips ?? 0) <= Math.max(0, raiseTo - (user?.bet ?? 0))}
              >
                <Text style={styles.actionBtnText}>Relancer</Text>
              </Pressable>
            </View>

            <View style={styles.raiseControlRow}>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setRaiseTo((value) => Math.max(currentBet + 40, value - 20))}
              >
                <Text style={styles.stepBtnText}>-</Text>
              </Pressable>
              <Text style={styles.raiseAmount}>{`Relance à ${raiseTo}`}</Text>
              <Pressable
                style={styles.stepBtn}
                onPress={() => setRaiseTo((value) => {
                  const maxRaise = Math.max(currentBet + 40, (user?.bet ?? 0) + (user?.chips ?? 0));
                  return Math.min(maxRaise, value + 20);
                })}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.turnMetaText}>
                {activePlayerId !== null
                  ? `${players.find((player) => player.id === activePlayerId)?.name ?? "Joueur"} • ${turnSecondsLeft}s`
                  : "En attente..."}
              </Text>
              {syncing ? <Text style={styles.syncText}>Synchronisation du solde...</Text> : null}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function combinations<T>(array: T[], choose: number): T[][] {
  const result: T[][] = [];
  const current: T[] = [];

  const dfs = (start: number) => {
    if (current.length === choose) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i += 1) {
      current.push(array[i]);
      dfs(i + 1);
      current.pop();
    }
  };

  dfs(0);
  return result;
}

function evaluateBestOfSeven(cards: Card[]): HandScore {
  const combos = combinations(cards, 5);
  let best = evaluateFive(combos[0]);

  for (let i = 1; i < combos.length; i += 1) {
    const score = evaluateFive(combos[i]);
    if (compareHandScores(score, best) > 0) {
      best = score;
    }
  }

  return best;
}

function evaluateFive(cards: Card[]): HandScore {
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const countEntries = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straightHigh = getStraightHigh(values);
  const straight = straightHigh > 0;

  if (flush && straight) return { category: 8, tiebreak: [straightHigh] };
  if (countEntries[0][1] === 4) return { category: 7, tiebreak: [countEntries[0][0], countEntries[1][0]] };
  if (countEntries[0][1] === 3 && countEntries[1][1] === 2) return { category: 6, tiebreak: [countEntries[0][0], countEntries[1][0]] };
  if (flush) return { category: 5, tiebreak: values };
  if (straight) return { category: 4, tiebreak: [straightHigh] };
  if (countEntries[0][1] === 3) return { category: 3, tiebreak: [countEntries[0][0], ...countEntries.slice(1).map((v) => v[0]).sort((a, b) => b - a)] };
  if (countEntries[0][1] === 2 && countEntries[1][1] === 2) {
    const highPair = Math.max(countEntries[0][0], countEntries[1][0]);
    const lowPair = Math.min(countEntries[0][0], countEntries[1][0]);
    return { category: 2, tiebreak: [highPair, lowPair, countEntries[2][0]] };
  }
  if (countEntries[0][1] === 2) return { category: 1, tiebreak: [countEntries[0][0], ...countEntries.slice(1).map((v) => v[0]).sort((a, b) => b - a)] };
  return { category: 0, tiebreak: values };
}

function getStraightHigh(values: number[]): number {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.length !== 5) return 0;
  if (unique[0] - unique[4] === 4) return unique[0];
  if (unique.join(",") === "14,5,4,3,2") return 5;
  return 0;
}

function compareHandScores(a: HandScore, b: HandScore): number {
  if (a.category !== b.category) return a.category - b.category;

  const length = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < length; i += 1) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }

  return 0;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: casinoTheme.colors.bg,
  },
  lobbyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  lobbyCard: {
    width: "100%",
    maxWidth: 760,
    borderRadius: casinoTheme.radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.9),
    backgroundColor: casinoTheme.colors.panel,
    padding: 20,
    gap: 12,
  },
  lobbyTag: {
    color: casinoTheme.colors.gold,
    fontWeight: "800",
    letterSpacing: 1.4,
    fontSize: 12,
  },
  lobbyTitle: {
    color: casinoTheme.colors.text,
    fontSize: 34,
    fontWeight: "900",
  },
  lobbySubtitle: {
    color: casinoTheme.colors.textMuted,
    fontSize: 14,
  },
  aiRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  aiButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.8),
    backgroundColor: withAlpha(casinoTheme.colors.bgAlt, 0.9),
    justifyContent: "center",
    alignItems: "center",
  },
  aiButtonText: {
    color: casinoTheme.colors.text,
    fontSize: 24,
    fontWeight: "900",
  },
  aiValue: {
    color: casinoTheme.colors.cyan,
    fontWeight: "900",
    fontSize: 20,
    minWidth: 90,
    textAlign: "center",
  },
  ctaButton: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.gold, 0.95),
    backgroundColor: withAlpha(casinoTheme.colors.gold, 0.93),
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#29190b",
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: 0.6,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  headerBar: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: casinoTheme.colors.text,
    fontWeight: "900",
    fontSize: 19,
  },
  headerSubtitle: {
    color: casinoTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 2,
  },
  tableWrap: {
    height: 600,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 0,
    backgroundColor: "#1a2230",
    position: "relative",
  },
  felt: {
    position: "absolute",
    left: "7%",
    right: "7%",
    top: "11%",
    bottom: "11%",
    borderRadius: 999,
    borderWidth: 2,
    borderColor: withAlpha(casinoTheme.colors.gold, 0.45),
    backgroundColor: "#0a7a4f",
  },
  boardWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: [{ translateX: -145 }, { translateY: -65 }],
    width: 290,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.5),
    backgroundColor: withAlpha(casinoTheme.colors.bgAlt, 0.52),
    padding: 10,
    alignItems: "center",
    gap: 6,
  },
  potLabel: {
    color: casinoTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  potValue: {
    color: casinoTheme.colors.gold,
    fontWeight: "900",
    fontSize: 24,
  },
  boardCards: {
    flexDirection: "row",
    gap: 6,
  },
  seat: {
    position: "absolute",
    transform: [{ translateX: -78 }, { translateY: -50 }],
    width: 156,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.3),
    backgroundColor: withAlpha(casinoTheme.colors.bg, 0.22),
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    gap: 3,
  },
  userSeat: {
    transform: [{ translateX: -92 }, { translateY: -50 }],
    width: 184,
  },
  seatPlate: {
    width: "100%",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.75),
    backgroundColor: withAlpha(casinoTheme.colors.bg, 0.82),
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  seatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.gold, 0.55),
    backgroundColor: withAlpha(casinoTheme.colors.text, 0.2),
  },
  seatMeta: {
    flex: 1,
    gap: 1,
  },
  seatName: {
    color: casinoTheme.colors.text,
    fontWeight: "900",
    fontSize: 12,
  },
  seatStack: {
    color: withAlpha(casinoTheme.colors.text, 0.92),
    fontWeight: "800",
    fontSize: 11,
  },
  seatStatus: {
    color: casinoTheme.colors.gold,
    fontWeight: "800",
    minHeight: 13,
    fontSize: 10,
  },
  turnBarTrack: {
    marginTop: 2,
    height: 4,
    borderRadius: 999,
    width: "100%",
    backgroundColor: withAlpha(casinoTheme.colors.text, 0.15),
    overflow: "hidden",
  },
  turnBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: casinoTheme.colors.cyan,
  },
  holeCards: {
    marginTop: 3,
    flexDirection: "row",
    gap: 6,
  },
  card: {
    width: 30,
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.8),
    backgroundColor: "#f3f6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBig: {
    width: 52,
    height: 74,
    borderRadius: 10,
  },
  cardBack: {
    backgroundColor: "#1c355b",
  },
  cardText: {
    color: "#101624",
    fontSize: 12,
    fontWeight: "900",
  },
  cardTextBig: {
    fontSize: 18,
  },
  cardTextRed: {
    color: "#b11f3c",
  },
  userBetText: {
    color: casinoTheme.colors.gold,
    fontWeight: "900",
    fontSize: 12,
    marginTop: 2,
  },
  seatActive: {
    borderColor: withAlpha(casinoTheme.colors.cyan, 0.95),
    shadowColor: casinoTheme.colors.cyan,
    shadowOpacity: 0.32,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  actionBar: {
    borderRadius: casinoTheme.radius.md,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.8),
    backgroundColor: casinoTheme.colors.panel,
    padding: 12,
    gap: 10,
  },
  statusText: {
    color: casinoTheme.colors.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
  },
  foldBtn: {
    backgroundColor: withAlpha(casinoTheme.colors.red, 0.45),
    borderColor: withAlpha(casinoTheme.colors.red, 0.9),
  },
  callBtn: {
    backgroundColor: withAlpha(casinoTheme.colors.cyan, 0.24),
    borderColor: withAlpha(casinoTheme.colors.cyan, 0.6),
  },
  raiseBtn: {
    backgroundColor: withAlpha(casinoTheme.colors.green, 0.3),
    borderColor: withAlpha(casinoTheme.colors.green, 0.7),
  },
  disabledBtn: {
    opacity: 0.45,
  },
  actionBtnText: {
    color: casinoTheme.colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  raiseControlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.panelBorder, 0.45),
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: withAlpha(casinoTheme.colors.bgAlt, 0.65),
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withAlpha(casinoTheme.colors.gold, 0.8),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: withAlpha(casinoTheme.colors.gold, 0.2),
  },
  stepBtnText: {
    color: casinoTheme.colors.gold,
    fontWeight: "900",
    fontSize: 18,
    lineHeight: 20,
  },
  raiseAmount: {
    color: casinoTheme.colors.text,
    fontWeight: "800",
    fontSize: 13,
  },
  syncText: {
    color: casinoTheme.colors.gold,
    fontWeight: "700",
    fontSize: 11,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  turnMetaText: {
    color: casinoTheme.colors.cyan,
    fontWeight: "800",
    fontSize: 11,
  },
});
