import { useMemo, useRef, useState } from "react";
import {
    calculateTotalReturn,
    calculateTotalStake,
    getBetKey,
    RouletteBet,
    RouletteBetInput,
} from "../utils/payouts";

export const DEFAULT_CHIPS = [1, 5, 10, 25, 100] as const;
const HISTORY_LIMIT = 10;
const API_BASE_URL = "http://localhost:3000/api";

type SpinApiResponse = {
  data?: {
    resultNumber: number;
    totalStake: number;
    totalReturn: number;
    net: number;
    bankrollAfter: number;
  };
};

export type RouletteGameState = {
  bankroll: number;
  selectedChip: number;
  bets: RouletteBet[];
  totalStake: number;
  spinning: boolean;
  result: number | null;
  history: number[];
  lastSpin: {
    result: number;
    totalStake: number;
    totalReturn: number;
    net: number;
    isWin: boolean;
  } | null;
};

export function useRouletteGame(initialBankroll = 1000) {
  const [bankroll, setBankroll] = useState(initialBankroll);
  const [selectedChip, setSelectedChip] = useState<number>(DEFAULT_CHIPS[2]);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [lastSpin, setLastSpin] = useState<RouletteGameState["lastSpin"]>(null);
  const animationResultRef = useRef<number | null>(null);

  const totalStake = useMemo(() => calculateTotalStake(bets), [bets]);

  async function requestBackendSpin(currentBankroll: number, currentBets: RouletteBet[]) {
    try {
      const response = await fetch(`${API_BASE_URL}/roulette/spin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankroll: currentBankroll,
          bets: currentBets,
        }),
      });

      if (!response.ok) return null;
      const payload = (await response.json()) as SpinApiResponse;
      if (!payload.data) return null;
      return payload.data;
    } catch {
      return null;
    }
  }

  function placeBet(betInput: RouletteBetInput) {
    if (spinning) return false;
    if (bankroll < selectedChip) return false;

    const betWithAmount: RouletteBet = { ...betInput, amount: selectedChip };
    const key = getBetKey(betWithAmount);

    setBankroll((previous: number) => previous - selectedChip);
    setBets((previous: RouletteBet[]) => {
      let existing: RouletteBet | null = null;
      for (let index = 0; index < previous.length; index += 1) {
        const current = previous[index];
        if (getBetKey(current) === key) {
          existing = current;
          break;
        }
      }
      if (!existing) {
        return [...previous, betWithAmount];
      }

      return previous.map((bet: RouletteBet) =>
        getBetKey(bet) === key ? { ...bet, amount: bet.amount + selectedChip } : bet,
      );
    });

    return true;
  }

  function clearBets() {
    if (spinning || bets.length === 0) return;
    const refund = calculateTotalStake(bets);
    setBets([]);
    setBankroll((previous: number) => previous + refund);
  }

  function doubleBets() {
    if (spinning || bets.length === 0) return false;
    const required = calculateTotalStake(bets);
    if (bankroll < required) return false;

    setBankroll((previous: number) => previous - required);
    setBets((previous: RouletteBet[]) =>
      previous.map((bet: RouletteBet) => ({ ...bet, amount: bet.amount * 2 })),
    );
    return true;
  }

  function spinWheel() {
    if (spinning || bets.length === 0) return false;

    setSpinning(true);
    animationResultRef.current = null; // Reset pour le prochain spin
    const currentBets = [...bets];
    const currentBankroll = bankroll;

    const pendingRemoteSpin = requestBackendSpin(currentBankroll, currentBets);

    setTimeout(() => {
      pendingRemoteSpin.then((remoteSpin) => {
        // Utiliser le résultat de l'animation au lieu du backend
        const spinResult = animationResultRef.current ?? Math.floor(Math.random() * 37);
        const spinStake = calculateTotalStake(currentBets);
        const wonAmount = calculateTotalReturn(currentBets, spinResult);
        const net = wonAmount - spinStake;

        console.log(`[Hook] Using animation result: ${animationResultRef.current} → final: ${spinResult}`);

        setBankroll((previous: number) => previous + wonAmount);
        setResult(spinResult);
        setHistory((previous: number[]) => [spinResult, ...previous].slice(0, HISTORY_LIMIT));
        setLastSpin({
          result: spinResult,
          totalStake: spinStake,
          totalReturn: wonAmount,
          net,
          isWin: wonAmount > 0,
        });
        setBets([]);
        setSpinning(false);
      });
    }, 2200);

    return true;
  }

  function handleResultGenerated(generatedResult: number) {
    console.log(`[Hook] Received animation result: ${generatedResult}`);
    animationResultRef.current = generatedResult;
  }

  const gameState: RouletteGameState = {
    bankroll,
    selectedChip,
    bets,
    totalStake,
    spinning,
    result,
    history,
    lastSpin,
  };

  return {
    ...gameState,
    setSelectedChip,
    placeBet,
    clearBets,
    doubleBets,
    spinWheel,
    onResultGenerated: handleResultGenerated,
  };
}
