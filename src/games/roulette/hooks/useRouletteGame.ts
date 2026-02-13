import { useMemo, useState } from "react";
import { authStorage } from "@/src/services/authStorage";
import { getApiBaseUrls } from "@/src/services/apiBaseUrl";
import {
    calculateTotalReturn,
    calculateTotalStake,
    getBetKey,
    RouletteBet,
    RouletteBetInput,
} from "../utils/payouts";

export const DEFAULT_CHIPS = [1, 5, 10, 25, 100] as const;
const HISTORY_LIMIT = 10;

type SpinApiResponse = {
  data?: {
    resultNumber: number;
    totalStake: number;
    totalReturn: number;
    net: number;
    chipBalance: number;
  };
};

export type RouletteGameState = {
  bankroll: number;
  selectedChip: number;
  bets: RouletteBet[];
  totalStake: number;
  spinning: boolean;
  result: number | null;
  spinTargetResult: number | null;
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
  const [spinTargetResult, setSpinTargetResult] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [lastSpin, setLastSpin] = useState<RouletteGameState["lastSpin"]>(null);

  const totalStake = useMemo(() => calculateTotalStake(bets), [bets]);

  async function requestBackendSpin(currentBets: RouletteBet[]) {
    const token = await authStorage.getToken();
    if (!token) {
      return null;
    }

    const baseUrls = getApiBaseUrls();

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/roulette/spin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bets: currentBets,
          }),
        });

        if (!response.ok) {
          continue;
        }

        const payload = (await response.json()) as SpinApiResponse;
        if (!payload.data) {
          continue;
        }

        return payload.data;
      } catch {
        continue;
      }
    }

    return null;
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
    setSpinTargetResult(null);
    const currentBets = [...bets];

    const pendingRemoteSpin = requestBackendSpin(currentBets);
    pendingRemoteSpin.then((remoteSpin) => {
      if (!remoteSpin) {
        setSpinning(false);
        return;
      }

      const spinResult = remoteSpin.resultNumber;
      const spinStake = remoteSpin.totalStake;
      const wonAmount = remoteSpin.totalReturn;
      const net = remoteSpin.net;

      setSpinTargetResult(spinResult);

      setTimeout(() => {
        setBankroll(remoteSpin.chipBalance);
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
        setSpinTargetResult(null);
        setSpinning(false);
      }, 2200);
    });

    return true;
  }

  const gameState: RouletteGameState = {
    bankroll,
    selectedChip,
    bets,
    totalStake,
    spinning,
    result,
    spinTargetResult,
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
  };
}
