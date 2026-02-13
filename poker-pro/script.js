const lobbyScreen = document.getElementById("lobbyScreen");
const tableScreen = document.getElementById("tableScreen");
const aiCountRange = document.getElementById("aiCountRange");
const aiCountValue = document.getElementById("aiCountValue");
const startGameBtn = document.getElementById("startGameBtn");

const seatsLayer = document.getElementById("seatsLayer");
const communityCardsEl = document.getElementById("communityCards");
const chipPileEl = document.getElementById("chipPile");

const handStateLabel = document.getElementById("handStateLabel");
const potValue = document.getElementById("potValue");
const potCenterValue = document.getElementById("potCenterValue");
const statusText = document.getElementById("statusText");

const foldBtn = document.getElementById("foldBtn");
const callBtn = document.getElementById("callBtn");
const raiseBtn = document.getElementById("raiseBtn");
const raiseRange = document.getElementById("raiseRange");
const raiseAmount = document.getElementById("raiseAmount");

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const STREET_LABELS = ["Pré-flop", "Flop", "Turn", "River", "Showdown"];

const AI_NAMES = [
  "Viper", "Orion", "Nova", "Blaze", "Kronos", "Echo", "Lyra", "Rogue", "Ghost", "Astra",
];

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

const state = {
  handNumber: 1,
  phase: 0,
  players: [],
  deck: [],
  board: [],
  pot: 0,
  dealerIndex: -1,
  smallBlind: 20,
  bigBlind: 40,
  currentBet: 0,
  minRaiseTo: 0,
  lastRaiseSize: 40,
  actionIndex: -1,
  awaitingUser: false,
  handRunning: false,
  showdownMode: false,
};

aiCountRange.addEventListener("input", () => {
  aiCountValue.textContent = aiCountRange.value;
});

startGameBtn.addEventListener("click", startGame);
foldBtn.addEventListener("click", onUserFold);
callBtn.addEventListener("click", onUserCall);
raiseBtn.addEventListener("click", onUserRaise);
raiseRange.addEventListener("input", () => {
  raiseAmount.textContent = String(Number(raiseRange.value));
});

setActionEnabled(false);

function startGame() {
  const aiCount = Number(aiCountRange.value);
  const totalPlayers = aiCount + 1;

  state.players = [];
  state.handNumber = 1;
  state.dealerIndex = -1;

  for (let i = 0; i < totalPlayers; i += 1) {
    const isUser = i === 0;
    state.players.push({
      id: i,
      isUser,
      name: isUser ? "Vous" : AI_NAMES[(i - 1) % AI_NAMES.length],
      chips: isUser ? 3000 : randomInt(2500, 4200),
      cards: [],
      bet: 0,
      totalContribution: 0,
      folded: false,
      allIn: false,
      actedThisRound: false,
      status: "",
      handScore: null,
    });
  }

  lobbyScreen.classList.add("hidden");
  tableScreen.classList.remove("hidden");

  renderSeats();
  startNewHand();
}

function startNewHand() {
  const alive = state.players.filter((p) => p.chips > 0);
  if (alive.length < 2) {
    const winner = alive[0] || state.players[0];
    statusText.textContent = `Partie terminée. ${winner.name} gagne la table.`;
    setActionEnabled(false);
    state.handRunning = false;
    return;
  }

  state.showdownMode = false;
  state.handRunning = true;
  state.phase = 0;
  state.board = [];
  state.pot = 0;
  state.currentBet = 0;
  state.lastRaiseSize = state.bigBlind;
  state.minRaiseTo = state.bigBlind;

  state.dealerIndex = nextEligibleFrom(state.dealerIndex);

  for (const player of state.players) {
    player.cards = [];
    player.bet = 0;
    player.totalContribution = 0;
    player.folded = player.chips <= 0;
    player.allIn = false;
    player.actedThisRound = false;
    player.status = player.folded ? "Hors-jeu" : "";
    player.handScore = null;
  }

  state.deck = shuffledDeck();
  dealHoleCards();

  const sbIndex = nextEligibleFrom(state.dealerIndex);
  const bbIndex = nextEligibleFrom(sbIndex);

  postBlind(state.players[sbIndex], state.smallBlind, "SB");
  postBlind(state.players[bbIndex], state.bigBlind, "BB");

  state.currentBet = Math.max(...state.players.map((p) => p.bet));
  state.minRaiseTo = state.currentBet + state.bigBlind;

  state.actionIndex = findNextToAct(bbIndex);

  updateHeader();
  updateBoardUI();
  renderSeats();

  statusText.textContent = `Main #${state.handNumber}. Les blindes sont postées.`;
  runBettingLoop();
}

function dealHoleCards() {
  for (let i = 0; i < 2; i += 1) {
    for (let step = 1; step <= state.players.length; step += 1) {
      const idx = (state.dealerIndex + step) % state.players.length;
      const player = state.players[idx];
      if (!player.folded) {
        player.cards.push(state.deck.pop());
      }
    }
  }
}

function runBettingLoop() {
  if (!state.handRunning) return;
  if (remainingContenders().length <= 1) {
    finishByFold();
    return;
  }

  if (state.actionIndex === -1) {
    advanceStreet();
    return;
  }

  const player = state.players[state.actionIndex];
  if (!isPlayerEligibleToAct(player)) {
    state.actionIndex = findNextToAct(state.actionIndex);
    runBettingLoop();
    return;
  }

  if (player.isUser) {
    state.awaitingUser = true;
    updateActionControls();
    setActionEnabled(true);
    statusText.textContent = `À vous d'agir (${STREET_LABELS[state.phase]}).`;
    return;
  }

  state.awaitingUser = false;
  setActionEnabled(false);

  setTimeout(() => {
    processAIAction(player);
  }, randomInt(450, 900));
}

function onUserFold() {
  if (!canUserAct()) return;
  const user = getUser();
  user.folded = true;
  user.actedThisRound = true;
  user.status = "Fold";
  statusText.textContent = "Vous vous couchez.";
  proceedAfterAction(user, false);
}

function onUserCall() {
  if (!canUserAct()) return;
  const user = getUser();
  const toCall = Math.max(0, state.currentBet - user.bet);

  if (toCall === 0) {
    user.actedThisRound = true;
    user.status = "Check";
    statusText.textContent = "Vous checkez.";
    proceedAfterAction(user, false);
    return;
  }

  const paid = payFromPlayer(user, toCall);
  user.actedThisRound = true;
  user.status = paid < toCall ? `All-in ${paid}` : `Call ${paid}`;
  statusText.textContent = paid < toCall ? "Vous êtes all-in." : `Vous suivez ${paid}.`;
  proceedAfterAction(user, false);
}

function onUserRaise() {
  if (!canUserAct()) return;
  const user = getUser();

  const raiseTo = Number(raiseRange.value);
  const toCall = Math.max(0, state.currentBet - user.bet);
  const maxBet = user.bet + user.chips;

  if (maxBet <= state.currentBet) {
    statusText.textContent = "Pas assez de jetons pour relancer.";
    return;
  }

  if (raiseTo > maxBet) {
    statusText.textContent = `Relance max: ${maxBet}.`;
    return;
  }

  const isAllInRaise = raiseTo === maxBet;
  if (!isAllInRaise && raiseTo < state.minRaiseTo) {
    statusText.textContent = `Relance minimale: ${state.minRaiseTo}.`;
    return;
  }

  const needed = raiseTo - user.bet;
  const paid = payFromPlayer(user, needed);
  const finalBet = user.bet;

  if (paid <= 0 || finalBet <= state.currentBet) {
    statusText.textContent = "Relance invalide.";
    return;
  }

  applyRaiseState(finalBet, state.currentBet);
  user.actedThisRound = true;
  user.status = user.allIn ? `All-in ${finalBet}` : `Raise ${finalBet}`;
  statusText.textContent = `Vous relancez à ${finalBet}.`;
  proceedAfterAction(user, true);
}

function processAIAction(player) {
  const toCall = Math.max(0, state.currentBet - player.bet);
  const maxBet = player.bet + player.chips;
  const strength = aiStrengthScore(player);
  const potOdds = toCall > 0 ? toCall / Math.max(state.pot, 1) : 0;

  if (toCall === 0) {
    const raiseChance = clamp(strength * 0.5 + (0.2 - Math.random() * 0.2), 0.05, 0.7);
    const shouldRaise = maxBet > state.currentBet && Math.random() < raiseChance;

    if (shouldRaise) {
      const target = buildAIRaiseTarget(player, strength);
      if (target > state.currentBet) {
        payFromPlayer(player, target - player.bet);
        applyRaiseState(target, state.currentBet);
        player.actedThisRound = true;
        player.status = player.allIn ? `All-in ${target}` : `Raise ${target}`;
        proceedAfterAction(player, true);
        return;
      }
    }

    player.actedThisRound = true;
    player.status = "Check";
    proceedAfterAction(player, false);
    return;
  }

  const pressure = toCall / Math.max(player.chips + toCall, 1);
  const foldThreshold = clamp(0.62 - strength * 0.55 + potOdds * 0.35 + pressure * 0.25, 0.08, 0.86);

  if (Math.random() < foldThreshold && strength < 0.72) {
    player.folded = true;
    player.actedThisRound = true;
    player.status = "Fold";
    proceedAfterAction(player, false);
    return;
  }

  const aggressive = strength > 0.65 && player.chips > toCall + state.bigBlind && Math.random() < 0.32;
  if (aggressive) {
    const target = buildAIRaiseTarget(player, strength);
    if (target > state.currentBet && target <= maxBet) {
      payFromPlayer(player, target - player.bet);
      applyRaiseState(target, state.currentBet);
      player.actedThisRound = true;
      player.status = player.allIn ? `All-in ${target}` : `Raise ${target}`;
      proceedAfterAction(player, true);
      return;
    }
  }

  const paid = payFromPlayer(player, toCall);
  player.actedThisRound = true;
  player.status = paid < toCall ? `All-in ${paid}` : `Call ${paid}`;
  proceedAfterAction(player, false);
}

function proceedAfterAction(actor, isRaise) {
  renderSeats();
  updateBoardUI();

  if (remainingContenders().length <= 1) {
    finishByFold();
    return;
  }

  state.awaitingUser = false;
  setActionEnabled(false);

  if (isRaise) {
    resetActedFlagsForRaise(actor.id);
  }

  state.actionIndex = findNextToAct(actor.id);
  if (state.actionIndex === -1) {
    advanceStreet();
    return;
  }

  runBettingLoop();
}

function advanceStreet() {
  if (!state.handRunning) return;

  if (allContendersAllIn()) {
    dealToRiver();
    doShowdown();
    return;
  }

  if (state.phase === 0) {
    burnOne();
    dealCommunity(3);
    state.phase = 1;
  } else if (state.phase === 1) {
    burnOne();
    dealCommunity(1);
    state.phase = 2;
  } else if (state.phase === 2) {
    burnOne();
    dealCommunity(1);
    state.phase = 3;
  } else {
    state.phase = 4;
    doShowdown();
    return;
  }

  prepareNewBettingRound();
  updateHeader();
  updateBoardUI();
  renderSeats();

  statusText.textContent = `${STREET_LABELS[state.phase]} distribué.`;
  runBettingLoop();
}

function prepareNewBettingRound() {
  state.currentBet = 0;
  state.lastRaiseSize = state.bigBlind;
  state.minRaiseTo = state.bigBlind;

  for (const player of state.players) {
    player.bet = 0;
    player.actedThisRound = false;
    if (!player.folded && !player.allIn) {
      player.status = "";
    }
  }

  state.actionIndex = findNextToAct(state.dealerIndex);
}

function finishByFold() {
  const winner = remainingContenders()[0];
  if (!winner) return;

  winner.chips += state.pot;
  winner.status = `Ramasse ${state.pot}`;
  statusText.textContent = `${winner.name} remporte ${state.pot} (tout le monde a fold).`;

  state.pot = 0;
  state.handRunning = false;
  state.showdownMode = true;

  updateHeader();
  updateBoardUI();
  renderSeats();

  state.handNumber += 1;
  setTimeout(startNewHand, 1800);
}

function doShowdown() {
  state.phase = 4;
  state.showdownMode = true;

  const contenders = remainingContenders();
  for (const player of contenders) {
    player.handScore = evaluateBestOfSeven([...player.cards, ...state.board]);
  }

  distributeSidePots(contenders);

  updateHeader();
  updateBoardUI();
  renderSeats();

  const top = getTopContenders(contenders);
  if (top.length === 1) {
    statusText.textContent = `${top[0].name} gagne avec ${HAND_NAMES[top[0].handScore.category]}.`;
  } else {
    const names = top.map((p) => p.name).join(", ");
    statusText.textContent = `Pot partagé entre ${names} (${HAND_NAMES[top[0].handScore.category]}).`;
  }

  state.pot = 0;
  state.handRunning = false;

  state.handNumber += 1;
  setTimeout(startNewHand, 2600);
}

function distributeSidePots(contenders) {
  const levels = [...new Set(state.players.map((p) => p.totalContribution).filter((v) => v > 0))].sort((a, b) => a - b);
  let previous = 0;

  for (const level of levels) {
    const inPot = state.players.filter((p) => p.totalContribution >= level);
    const potChunk = (level - previous) * inPot.length;
    previous = level;
    if (potChunk <= 0) continue;

    const eligible = contenders.filter((p) => p.totalContribution >= level);
    if (!eligible.length) continue;

    let winners = [eligible[0]];
    for (let i = 1; i < eligible.length; i += 1) {
      const cmp = compareHandScores(eligible[i].handScore, winners[0].handScore);
      if (cmp > 0) {
        winners = [eligible[i]];
      } else if (cmp === 0) {
        winners.push(eligible[i]);
      }
    }

    const share = Math.floor(potChunk / winners.length);
    let remainder = potChunk - share * winners.length;

    for (const w of winners) {
      const extra = remainder > 0 ? 1 : 0;
      w.chips += share + extra;
      remainder -= extra;
      w.status = winners.length > 1 ? `Split ${share + extra}` : `Gagne ${potChunk}`;
    }
  }

  for (const p of contenders) {
    if (!p.status) {
      p.status = `Perd (${HAND_NAMES[p.handScore.category]})`;
    }
  }
}

function getTopContenders(contenders) {
  if (!contenders.length) return [];
  let top = [contenders[0]];
  for (let i = 1; i < contenders.length; i += 1) {
    const cmp = compareHandScores(contenders[i].handScore, top[0].handScore);
    if (cmp > 0) {
      top = [contenders[i]];
    } else if (cmp === 0) {
      top.push(contenders[i]);
    }
  }
  return top;
}

function dealToRiver() {
  if (state.phase < 1) {
    burnOne();
    dealCommunity(3);
    state.phase = 1;
  }
  if (state.phase < 2) {
    burnOne();
    dealCommunity(1);
    state.phase = 2;
  }
  if (state.phase < 3) {
    burnOne();
    dealCommunity(1);
    state.phase = 3;
  }

  updateHeader();
  updateBoardUI();
}

function burnOne() {
  state.deck.pop();
}

function dealCommunity(count) {
  for (let i = 0; i < count; i += 1) {
    state.board.push(state.deck.pop());
  }
}

function updateHeader() {
  handStateLabel.textContent = `Main #${state.handNumber} · ${STREET_LABELS[state.phase]}`;
}

function updateBoardUI() {
  potValue.textContent = String(state.pot);
  potCenterValue.textContent = String(state.pot);

  chipPileEl.innerHTML = "";
  const chips = Math.max(0, Math.min(24, Math.floor(state.pot / 60)));
  for (let i = 0; i < chips; i += 1) {
    const chip = document.createElement("span");
    chip.className = `chip ${i % 3 === 0 ? "c-red" : i % 3 === 1 ? "c-blue" : "c-gold"}`;
    chipPileEl.appendChild(chip);
  }

  communityCardsEl.innerHTML = "";
  for (let i = 0; i < 5; i += 1) {
    const cardData = state.board[i];
    const card = createCardEl(cardData, false, true);
    if (cardData) card.classList.add("deal-in");
    communityCardsEl.appendChild(card);
  }
}

function renderSeats() {
  const user = getUser();
  const ais = state.players.filter((p) => !p.isUser);

  seatsLayer.innerHTML = "";

  const centerX = 50;
  const centerY = 50;
  const radiusX = 40;
  const radiusY = 34;

  ais.forEach((player, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(ais.length, 1) - Math.PI / 2;
    const x = centerX + radiusX * Math.cos(angle);
    const y = centerY + radiusY * Math.sin(angle);
    seatsLayer.appendChild(createSeatEl(player, x, y));
  });

  if (user) {
    seatsLayer.appendChild(createSeatEl(user, 50, 88));
  }
}

function createSeatEl(player, xPercent, yPercent) {
  const seat = document.createElement("article");
  seat.className = `player-seat glass-panel${player.isUser ? " is-user" : ""}`;
  seat.style.left = `${xPercent}%`;
  seat.style.top = `${yPercent}%`;

  const head = document.createElement("div");
  head.className = "player-head";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = player.name.slice(0, 2).toUpperCase();

  const headText = document.createElement("div");
  const name = document.createElement("p");
  name.className = "player-name";
  name.textContent = player.name;

  const stack = document.createElement("p");
  stack.className = "player-stack";
  stack.textContent = `${player.chips} jetons`;

  headText.appendChild(name);
  headText.appendChild(stack);
  head.appendChild(avatar);
  head.appendChild(headText);

  const bet = document.createElement("div");
  bet.className = "player-bet";
  bet.textContent = `Mise: ${player.bet}`;

  const status = document.createElement("div");
  status.className = "player-status";
  let statusTextValue = player.status;
  if (state.showdownMode && player.handScore && !player.folded) {
    statusTextValue = `${statusTextValue ? `${statusTextValue} · ` : ""}${HAND_NAMES[player.handScore.category]}`;
  }
  status.textContent = statusTextValue;

  const cards = document.createElement("div");
  cards.className = "hole-cards";
  if (player.cards.length) {
    const hide = !player.isUser && !state.showdownMode;
    cards.appendChild(createCardEl(player.cards[0], hide, false));
    cards.appendChild(createCardEl(player.cards[1], hide, false));
  } else {
    cards.appendChild(createCardEl(null, true, false));
    cards.appendChild(createCardEl(null, true, false));
  }

  seat.appendChild(head);
  seat.appendChild(bet);
  seat.appendChild(status);
  seat.appendChild(cards);

  return seat;
}

function createCardEl(cardData, hidden, placeholder) {
  const card = document.createElement("div");
  card.className = "card";

  if (hidden) {
    card.classList.add("back");
    return card;
  }

  if (!cardData && placeholder) {
    card.classList.add("back");
    card.style.opacity = "0.45";
    return card;
  }

  if (!cardData) {
    card.classList.add("back");
    return card;
  }

  if (cardData.suit === "♥" || cardData.suit === "♦") {
    card.classList.add("red");
  }

  card.textContent = `${cardData.rank}${cardData.suit}`;
  return card;
}

function updateActionControls() {
  const user = getUser();
  if (!user || user.folded || user.allIn) {
    setActionEnabled(false);
    return;
  }

  const toCall = Math.max(0, state.currentBet - user.bet);
  callBtn.textContent = toCall > 0 ? `Suivre (${toCall})` : "Parole";

  const maxRaiseTo = user.bet + user.chips;
  const minRaiseTo = Math.max(state.minRaiseTo, state.currentBet + state.lastRaiseSize);

  const canRaise = maxRaiseTo > state.currentBet && maxRaiseTo >= minRaiseTo;
  raiseBtn.disabled = !canRaise;
  raiseRange.disabled = !canRaise;

  if (canRaise) {
    raiseRange.min = String(minRaiseTo);
    raiseRange.max = String(maxRaiseTo);
    raiseRange.step = "10";
    raiseRange.value = String(minRaiseTo);
    raiseAmount.textContent = String(minRaiseTo);
  } else {
    raiseRange.min = "0";
    raiseRange.max = "0";
    raiseRange.value = "0";
    raiseAmount.textContent = "0";
  }
}

function setActionEnabled(enabled) {
  foldBtn.disabled = !enabled;
  callBtn.disabled = !enabled;
  if (!enabled) {
    raiseBtn.disabled = true;
    raiseRange.disabled = true;
  } else {
    updateActionControls();
  }
}

function canUserAct() {
  if (!state.awaitingUser || !state.handRunning) return false;
  const user = getUser();
  return Boolean(user) && !user.folded && !user.allIn;
}

function payFromPlayer(player, amount) {
  const paid = Math.max(0, Math.min(amount, player.chips));
  player.chips -= paid;
  player.bet += paid;
  player.totalContribution += paid;
  state.pot += paid;
  if (player.chips === 0) player.allIn = true;
  return paid;
}

function postBlind(player, blindAmount, label) {
  const paid = payFromPlayer(player, blindAmount);
  player.status = paid < blindAmount ? `${label} All-in ${paid}` : `${label} ${paid}`;
}

function applyRaiseState(newBet, previousBet) {
  const raiseSize = newBet - previousBet;
  state.currentBet = newBet;
  state.lastRaiseSize = Math.max(raiseSize, state.bigBlind);
  state.minRaiseTo = state.currentBet + state.lastRaiseSize;
}

function resetActedFlagsForRaise(raiserId) {
  for (const player of state.players) {
    if (!player.folded && !player.allIn) {
      player.actedThisRound = player.id === raiserId;
    }
  }
}

function findNextToAct(afterIndex) {
  for (let step = 1; step <= state.players.length; step += 1) {
    const idx = (afterIndex + step) % state.players.length;
    const player = state.players[idx];
    if (!isPlayerEligibleToAct(player)) continue;

    const needsAct = !player.actedThisRound || player.bet < state.currentBet;
    if (needsAct) return idx;
  }
  return -1;
}

function isPlayerEligibleToAct(player) {
  return !player.folded && !player.allIn && player.chips > 0;
}

function remainingContenders() {
  return state.players.filter((p) => !p.folded && (p.chips > 0 || p.bet > 0 || p.totalContribution > 0));
}

function allContendersAllIn() {
  const contenders = remainingContenders();
  return contenders.length > 1 && contenders.every((p) => p.allIn || p.folded);
}

function nextEligibleFrom(startIndex) {
  for (let step = 1; step <= state.players.length; step += 1) {
    const idx = (startIndex + step + state.players.length) % state.players.length;
    if (state.players[idx].chips > 0) return idx;
  }
  return 0;
}

function getUser() {
  return state.players.find((p) => p.isUser);
}

function aiStrengthScore(player) {
  if (state.phase === 0) {
    return preflopStrength(player.cards[0], player.cards[1]);
  }

  const score = evaluateBestOfSeven([...player.cards, ...state.board]);
  return clamp((score.category * 0.13) + (score.tiebreak[0] || 0) / 22, 0.05, 0.98);
}

function preflopStrength(c1, c2) {
  const high = Math.max(c1.value, c2.value);
  const low = Math.min(c1.value, c2.value);
  const pair = c1.value === c2.value;
  const suited = c1.suit === c2.suit;
  const gap = Math.abs(c1.value - c2.value);

  let score = high / 16 + low / 30;
  if (pair) score += 0.32 + high / 22;
  if (suited) score += 0.08;
  if (gap === 1) score += 0.05;
  if (gap >= 4) score -= 0.07;

  return clamp(score, 0.04, 0.98);
}

function buildAIRaiseTarget(player, strength) {
  const maxBet = player.bet + player.chips;
  const minTarget = Math.max(state.minRaiseTo, state.currentBet + state.lastRaiseSize);
  if (minTarget > maxBet) return maxBet;

  const potBased = state.currentBet + Math.max(state.bigBlind, Math.floor(state.pot * (0.25 + strength * 0.55)));
  const raw = Math.max(minTarget, Math.min(maxBet, potBased));
  return roundTo10(raw);
}

function evaluateBestOfSeven(cards) {
  const combos = combinations(cards, 5);
  let best = evaluateFiveCardHand(combos[0]);

  for (let i = 1; i < combos.length; i += 1) {
    const score = evaluateFiveCardHand(combos[i]);
    if (compareHandScores(score, best) > 0) {
      best = score;
    }
  }

  return best;
}

function evaluateFiveCardHand(cards) {
  const valuesDesc = cards.map((c) => c.value).sort((a, b) => b - a);
  const counts = new Map();
  for (const v of valuesDesc) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }

  const countEntries = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  const isFlush = cards.every((c) => c.suit === cards[0].suit);
  const straightHigh = straightHighCard(valuesDesc);
  const isStraight = straightHigh > 0;

  if (isFlush && isStraight) {
    return { category: 8, tiebreak: [straightHigh] };
  }

  if (countEntries[0][1] === 4) {
    const quad = countEntries[0][0];
    const kicker = countEntries[1][0];
    return { category: 7, tiebreak: [quad, kicker] };
  }

  if (countEntries[0][1] === 3 && countEntries[1][1] === 2) {
    return { category: 6, tiebreak: [countEntries[0][0], countEntries[1][0]] };
  }

  if (isFlush) {
    return { category: 5, tiebreak: valuesDesc };
  }

  if (isStraight) {
    return { category: 4, tiebreak: [straightHigh] };
  }

  if (countEntries[0][1] === 3) {
    const triple = countEntries[0][0];
    const kickers = countEntries.slice(1).map((v) => v[0]).sort((a, b) => b - a);
    return { category: 3, tiebreak: [triple, ...kickers] };
  }

  if (countEntries[0][1] === 2 && countEntries[1][1] === 2) {
    const highPair = Math.max(countEntries[0][0], countEntries[1][0]);
    const lowPair = Math.min(countEntries[0][0], countEntries[1][0]);
    const kicker = countEntries[2][0];
    return { category: 2, tiebreak: [highPair, lowPair, kicker] };
  }

  if (countEntries[0][1] === 2) {
    const pair = countEntries[0][0];
    const kickers = countEntries.slice(1).map((v) => v[0]).sort((a, b) => b - a);
    return { category: 1, tiebreak: [pair, ...kickers] };
  }

  return { category: 0, tiebreak: valuesDesc };
}

function straightHighCard(valuesDesc) {
  const unique = [...new Set(valuesDesc)].sort((a, b) => b - a);
  if (unique.length !== 5) return 0;

  if (unique[0] - unique[4] === 4) {
    return unique[0];
  }

  const wheel = [14, 5, 4, 3, 2];
  if (wheel.every((v, i) => unique[i] === v)) {
    return 5;
  }

  return 0;
}

function compareHandScores(a, b) {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreak.length, b.tiebreak.length);
  for (let i = 0; i < len; i += 1) {
    const av = a.tiebreak[i] || 0;
    const bv = b.tiebreak[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function combinations(arr, k) {
  const result = [];
  const current = [];

  function dfs(start) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < arr.length; i += 1) {
      current.push(arr[i]);
      dfs(i + 1);
      current.pop();
    }
  }

  dfs(0);
  return result;
}

function shuffledDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, value: rankValue(rank) });
    }
  }

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function rankValue(rank) {
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  return Number(rank);
}

function roundTo10(v) {
  return Math.round(v / 10) * 10;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
