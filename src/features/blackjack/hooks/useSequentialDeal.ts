import { useEffect, useMemo, useRef, useState } from "react";

const DEAL_INTERVAL_MS = 520;
const INITIAL_DEAL_DELAY_MS = 140;
const POST_PLAYER_TO_DEALER_DELAY_MS = 520;

type DealStep =
  | { target: "dealer" }
  | { target: "player"; handIndex: number };

const clearAllTimeouts = (timeouts: Array<ReturnType<typeof setTimeout>>) => {
  timeouts.forEach(clearTimeout);
  timeouts.length = 0;
};

export default function useSequentialDeal(
  sessionId: string | undefined,
  dealerHand: unknown[],
  playerHands: unknown[][],
) {
  const [visibleDealerCount, setVisibleDealerCount] = useState(0);
  const [visiblePlayerCounts, setVisiblePlayerCounts] = useState<number[]>([]);
  const [dealTick, setDealTick] = useState(0);

  const previousSessionRef = useRef<string | undefined>(undefined);
  const dealerCountRef = useRef(0);
  const playerCountsRef = useRef<number[]>([]);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const playerHandLengths = useMemo(() => playerHands.map((hand) => hand.length), [playerHands]);
  const playerLengthsSignature = playerHandLengths.join("-");

  useEffect(() => {
    return () => {
      clearAllTimeouts(timeoutsRef.current);
    };
  }, []);

  useEffect(() => {
    clearAllTimeouts(timeoutsRef.current);

    if (!sessionId) {
      previousSessionRef.current = undefined;
      dealerCountRef.current = 0;
      playerCountsRef.current = [];
      setVisibleDealerCount(0);
      setVisiblePlayerCounts([]);
      setDealTick(0);
      return;
    }

    const isNewSession = previousSessionRef.current !== sessionId;
    previousSessionRef.current = sessionId;

    const targetDealerCount = dealerHand.length;
    const targetPlayerCounts = playerHandLengths;

    let currentDealerCount = dealerCountRef.current;
    let currentPlayerCounts = [...playerCountsRef.current];

    if (isNewSession) {
      currentDealerCount = 0;
      currentPlayerCounts = targetPlayerCounts.map(() => 0);
      dealerCountRef.current = 0;
      playerCountsRef.current = [...currentPlayerCounts];
      setVisibleDealerCount(0);
      setVisiblePlayerCounts(currentPlayerCounts);
    }

    if (currentPlayerCounts.length !== targetPlayerCounts.length) {
      currentPlayerCounts = targetPlayerCounts.map((_, index) => currentPlayerCounts[index] ?? 0);
      playerCountsRef.current = [...currentPlayerCounts];
      setVisiblePlayerCounts(currentPlayerCounts);
    }

    const hasDecrease =
      targetDealerCount < currentDealerCount ||
      targetPlayerCounts.some((count, index) => count < (currentPlayerCounts[index] ?? 0));

    if (hasDecrease) {
      dealerCountRef.current = targetDealerCount;
      playerCountsRef.current = [...targetPlayerCounts];
      setVisibleDealerCount(targetDealerCount);
      setVisiblePlayerCounts(targetPlayerCounts);
      return;
    }

    const dealerDelta = targetDealerCount - currentDealerCount;
    const playerDeltas = targetPlayerCounts.map((count, index) => count - (currentPlayerCounts[index] ?? 0));
    const maxDelta = Math.max(dealerDelta, ...playerDeltas, 0);

    if (maxDelta === 0) {
      return;
    }

    const steps: DealStep[] = [];

    for (let round = 0; round < maxDelta; round += 1) {
      if (isNewSession) {
        if (round < dealerDelta) {
          steps.push({ target: "dealer" });
        }

        for (let handIndex = 0; handIndex < playerDeltas.length; handIndex += 1) {
          if (round < playerDeltas[handIndex]) {
            steps.push({ target: "player", handIndex });
          }
        }

        continue;
      }

      for (let handIndex = 0; handIndex < playerDeltas.length; handIndex += 1) {
        if (round < playerDeltas[handIndex]) {
          steps.push({ target: "player", handIndex });
        }
      }

      if (round < dealerDelta) {
        steps.push({ target: "dealer" });
      }
    }

    const shouldDelayDealerStart = !isNewSession && dealerDelta > 0 && playerDeltas.some((delta) => delta > 0);
    let hasPlayerCardStep = false;
    let dealerPauseApplied = false;
    let scheduledDelay = INITIAL_DEAL_DELAY_MS;

    steps.forEach((step) => {
      if (shouldDelayDealerStart && !dealerPauseApplied && step.target === "dealer" && hasPlayerCardStep) {
        scheduledDelay += POST_PLAYER_TO_DEALER_DELAY_MS;
        dealerPauseApplied = true;
      }

      scheduledDelay += DEAL_INTERVAL_MS;
      const timeout = setTimeout(() => {
        if (step.target === "dealer") {
          dealerCountRef.current += 1;
          setVisibleDealerCount(dealerCountRef.current);
          setDealTick((tick) => tick + 1);
          return;
        }

        const nextCounts = [...playerCountsRef.current];
        nextCounts[step.handIndex] = (nextCounts[step.handIndex] ?? 0) + 1;
        playerCountsRef.current = nextCounts;
        setVisiblePlayerCounts(nextCounts);
        setDealTick((tick) => tick + 1);
      }, scheduledDelay);

      if (step.target === "player") {
        hasPlayerCardStep = true;
      }

      timeoutsRef.current.push(timeout);
    });
  }, [sessionId, dealerHand.length, playerLengthsSignature, playerHandLengths]);

  return {
    visibleDealerCount,
    visiblePlayerCounts,
    dealTick,
  };
}
