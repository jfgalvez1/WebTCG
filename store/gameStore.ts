"use client";
import { create } from "zustand";

export interface CardInstance {
  instanceId: string;
  url: string;
  rarity: "GENESIS" | "COMMON" | "DEAD_LINK";
  baseAttack: number;
  baseDef: number;
  baseConnection: number;
  factions: string[];
  currentHealth?: number;
  isTapped?: boolean;
  dateAcquired: string;
}

export interface BattlefieldCard extends CardInstance {
  currentHealth: number;
  isTapped: boolean;
  position: "player" | "opponent";
  isHub?: boolean;
  linkedTo?: string | null;
  isPopUp?: boolean;
  isFirewall?: boolean;
  bwDrain?: number;
}

type Phase =
  | "idle"
  | "taskManager"
  | "refresh"
  | "browsing"
  | "execution"
  | "cleanup"
  | "victory"
  | "defeat";

interface GameState {
  playerBW: number;
  opponentBW: number;
  turn: number;
  phase: Phase;

  playerCache: CardInstance[];
  playerHand: CardInstance[];
  playerBoard: BattlefieldCard[];

  opponentCache: CardInstance[];
  opponentHand: CardInstance[];
  opponentBoard: BattlefieldCard[];

  browsingHistory: CardInstance[];
  hyperlinks: Record<string, string[]>; // hubId → [linkedId, ...]
  selectedCard: string | null;

  // Actions
  startGame: (deck: CardInstance[]) => void;
  advancePhase: () => void;
  playCard: (instanceId: string) => void;
  hyperlinkCard: (cardId: string, hubId: string) => void;
  attackWithCard: (attackerId: string, targetId: string | "sysadmin") => void;
  selectCard: (instanceId: string | null) => void;
  resetGame: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTld(url: string): string {
  const parts = url.split(".");
  return parts.length >= 2 ? `.${parts[parts.length - 1]}` : "";
}

function deriveAbilities(card: CardInstance): Partial<BattlefieldCard> {
  const tld = getTld(card.url);
  const factions = card.factions ?? [];

  const isFirewall =
    tld === ".gov" || factions.includes("Government");

  const isPopUp =
    !isFirewall &&
    (tld === ".biz" ||
      (factions.includes("E-Commerce") && card.baseConnection <= 4));

  const isHub = !isPopUp && !isFirewall && card.baseConnection >= 6;

  return {
    isFirewall: isFirewall || undefined,
    isPopUp: isPopUp || undefined,
    bwDrain: isPopUp ? 3 : undefined,
    isHub: isHub || undefined,
  };
}

function toBattlefieldCard(
  card: CardInstance,
  position: "player" | "opponent"
): BattlefieldCard {
  return {
    ...card,
    currentHealth: card.baseDef,
    isTapped: false,
    position,
    ...deriveAbilities(card),
  };
}

function createOpponentDeck(): CardInstance[] {
  const aiDomains: Array<{
    url: string;
    attack: number;
    def: number;
    conn: number;
    factions: string[];
  }> = [
    { url: "evil-corp.com", attack: 4, def: 6, conn: 5, factions: ["Tech"] },
    { url: "hacknet.io", attack: 6, def: 4, conn: 5, factions: ["Tech"] },
    { url: "botfarm.net", attack: 3, def: 3, conn: 3, factions: ["Neutral"] },
    { url: "phisher.biz", attack: 5, def: 3, conn: 3, factions: ["E-Commerce"] },
    { url: "darkweb.gov", attack: 2, def: 8, conn: 4, factions: ["Government"] },
    { url: "malware.biz", attack: 4, def: 2, conn: 2, factions: ["E-Commerce"] },
    { url: "rootkit.io", attack: 7, def: 5, conn: 8, factions: ["Tech"] },
    { url: "spam-hub.net", attack: 3, def: 4, conn: 6, factions: ["Neutral"] },
  ];

  return aiDomains.map((d, i) => ({
    instanceId: `ai-${i}`,
    url: d.url,
    rarity: "COMMON" as const,
    baseAttack: d.attack,
    baseDef: d.def,
    baseConnection: d.conn,
    factions: d.factions,
    dateAcquired: new Date().toISOString(),
  }));
}

// ── AI logic ─────────────────────────────────────────────────────────────────

function runAiTurn(state: GameState): Partial<GameState> {
  let opponentBW = state.opponentBW;
  let opponentHand = [...state.opponentHand];
  let opponentBoard = [...state.opponentBoard];
  let opponentCache = [...state.opponentCache];
  let playerBoard = [...state.playerBoard];
  let playerBW = state.playerBW;
  const browsingHistory = [...state.browsingHistory];
  const hyperlinks = { ...state.hyperlinks };

  // 1. AI Task Manager: Pop-Ups on player board drain opponentBW
  //    (player-deployed pop-ups drain opponentBW; handled via player taskManager)

  // 2. AI Refresh: draw 1 if possible
  if (opponentCache.length > 0) {
    opponentHand = [...opponentHand, opponentCache[0]];
    opponentCache = opponentCache.slice(1);
  }

  // 3. AI Browsing: play cards it can afford (greedy)
  const sortedHand = [...opponentHand].sort(
    (a, b) => b.baseConnection - a.baseConnection
  );
  const playedIds = new Set<string>();
  for (const card of sortedHand) {
    if (opponentBoard.length >= 7) break;
    if (card.baseConnection <= opponentBW) {
      opponentBoard = [...opponentBoard, toBattlefieldCard(card, "opponent")];
      opponentBW -= card.baseConnection;
      playedIds.add(card.instanceId);
    }
  }
  opponentHand = opponentHand.filter((c) => !playedIds.has(c.instanceId));

  // 4. AI Execution: each untapped AI card attacks
  const playerFirewall = playerBoard.some((c) => c.isFirewall);

  for (const aiCard of opponentBoard) {
    if (aiCard.isTapped) continue;
    const atk = aiCard.baseAttack;

    if (playerBoard.length > 0) {
      // Prefer attacking Firewall cards first if any
      const firewallIdx = playerBoard.findIndex((c) => c.isFirewall);
      const targetIdx = firewallIdx >= 0 ? firewallIdx : Math.floor(Math.random() * playerBoard.length);
      const target = playerBoard[targetIdx];
      const newHP = target.currentHealth - atk;
      if (newHP <= 0) {
        browsingHistory.push(target);
        playerBoard = playerBoard.filter((c) => c.instanceId !== target.instanceId);
        // Remove hyperlinks for destroyed card
        if (target.isHub) {
          const linked = hyperlinks[target.instanceId] ?? [];
          linked.forEach((lid) => {
            const linkedCard = playerBoard.find((c) => c.instanceId === lid);
            if (linkedCard) browsingHistory.push(linkedCard);
          });
          playerBoard = playerBoard.filter(
            (c) => !((hyperlinks[target.instanceId] ?? []).includes(c.instanceId))
          );
          delete hyperlinks[target.instanceId];
        } else if (target.linkedTo) {
          const hub = hyperlinks[target.linkedTo];
          if (hub) {
            hyperlinks[target.linkedTo] = hub.filter((id) => id !== target.instanceId);
          }
        }
      } else {
        playerBoard = playerBoard.map((c) =>
          c.instanceId === target.instanceId ? { ...c, currentHealth: newHP } : c
        );
      }
    } else if (!playerFirewall) {
      playerBW -= atk;
    }
  }

  // Tap all AI cards that attacked (all untapped ones)
  opponentBoard = opponentBoard.map((c) =>
    !c.isTapped ? { ...c, isTapped: true } : c
  );

  return {
    opponentBW,
    opponentHand,
    opponentBoard,
    opponentCache,
    playerBoard,
    playerBW,
    browsingHistory,
    hyperlinks,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  playerBW: 100,
  opponentBW: 100,
  turn: 1,
  phase: "idle",

  playerCache: [],
  playerHand: [],
  playerBoard: [],

  opponentCache: [],
  opponentHand: [],
  opponentBoard: [],

  browsingHistory: [],
  hyperlinks: {},
  selectedCard: null,

  startGame: (deck) => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const hand = shuffled.slice(0, 5);
    const cache = shuffled.slice(5);

    const opponentDeck = createOpponentDeck().sort(() => Math.random() - 0.5);
    const opponentHand = opponentDeck.slice(0, 3);
    const opponentCache = opponentDeck.slice(3);

    set({
      playerBW: 100,
      opponentBW: 100,
      turn: 1,
      phase: "taskManager",
      playerCache: cache,
      playerHand: hand,
      playerBoard: [],
      opponentCache,
      opponentHand,
      opponentBoard: [],
      browsingHistory: [],
      hyperlinks: {},
      selectedCard: null,
    });
  },

  advancePhase: () => {
    const state = get();
    const { phase } = state;

    if (phase === "taskManager") {
      // Player Task Manager: drain opponentBW for each Pop-Up on opponent's board deployed by player
      // Pop-Ups on opponentBoard with position "opponent" were played by AI;
      // Pop-Ups placed by player would be "player"-origin but on opponentBoard.
      // For now: any pop-up on opponentBoard drains opponentBW, any on playerBoard drains playerBW
      let opponentBW = state.opponentBW;
      let playerBW = state.playerBW;

      state.opponentBoard.forEach((c) => {
        if (c.isPopUp) opponentBW -= c.bwDrain ?? 3;
      });
      state.playerBoard.forEach((c) => {
        if (c.isPopUp) playerBW -= c.bwDrain ?? 3;
      });

      if (playerBW <= 0) {
        set({ playerBW: 0, phase: "defeat" });
        return;
      }
      if (opponentBW <= 0) {
        set({ opponentBW: 0, phase: "victory" });
        return;
      }

      set({ playerBW, opponentBW, phase: "refresh" });
      return;
    }

    if (phase === "refresh") {
      // Draw 1, untap all player cards
      let playerHand = [...state.playerHand];
      let playerCache = [...state.playerCache];

      if (playerCache.length > 0) {
        playerHand = [...playerHand, playerCache[0]];
        playerCache = playerCache.slice(1);
      }

      // Cap hand at 7 (discard oldest if over)
      if (playerHand.length > 7) playerHand = playerHand.slice(playerHand.length - 7);

      const playerBoard = state.playerBoard.map((c) => ({ ...c, isTapped: false }));
      const untappedOpponentBoard = state.opponentBoard.map((c) => ({ ...c, isTapped: false }));

      set({ playerHand, playerCache, playerBoard, opponentBoard: untappedOpponentBoard, phase: "browsing" });
      return;
    }

    if (phase === "browsing") {
      set({ phase: "execution", selectedCard: null });
      return;
    }

    if (phase === "execution") {
      set({ phase: "cleanup", selectedCard: null });
      return;
    }

    if (phase === "cleanup") {
      // Discard down to 7
      let playerHand = [...state.playerHand];
      if (playerHand.length > 7) playerHand = playerHand.slice(0, 7);

      // Run AI turn
      const aiResult = runAiTurn({ ...state, playerHand });

      const newPlayerBW = aiResult.playerBW ?? state.playerBW;
      const newOpponentBW = aiResult.opponentBW ?? state.opponentBW;

      if (newPlayerBW <= 0) {
        set({ ...aiResult, playerHand, playerBW: 0, phase: "defeat", turn: state.turn + 1 });
        return;
      }
      if (newOpponentBW <= 0) {
        set({ ...aiResult, playerHand, opponentBW: 0, phase: "victory", turn: state.turn + 1 });
        return;
      }

      set({
        ...aiResult,
        playerHand,
        phase: "taskManager",
        turn: state.turn + 1,
        selectedCard: null,
      });
      return;
    }
  },

  playCard: (instanceId) => {
    const state = get();
    if (state.phase !== "browsing") return;

    const card = state.playerHand.find((c) => c.instanceId === instanceId);
    if (!card) return;

    const cost = card.baseConnection;
    if (state.playerBW <= cost) return; // must keep BW > 0 after playing (would == 0 = lose)

    const newBW = state.playerBW - cost;

    const boardCard = toBattlefieldCard(card, "player");
    let newBoard = [...state.playerBoard, boardCard];

    // Check 7-tab overload
    let browsingHistory = [...state.browsingHistory];
    let hyperlinks = { ...state.hyperlinks };
    if (newBoard.length > 7) {
      // Overload: discard entire board
      browsingHistory = [...browsingHistory, ...newBoard];
      // Clear all hyperlinks involving player cards
      newBoard.forEach((c) => {
        if (c.isHub) delete hyperlinks[c.instanceId];
      });
      newBoard = [];
    }

    const newHand = state.playerHand.filter((c) => c.instanceId !== instanceId);

    if (newBW <= 0) {
      set({
        playerBW: 0,
        playerHand: newHand,
        playerBoard: newBoard,
        browsingHistory,
        hyperlinks,
        phase: "defeat",
      });
      return;
    }

    set({
      playerBW: newBW,
      playerHand: newHand,
      playerBoard: newBoard,
      browsingHistory,
      hyperlinks,
    });
  },

  hyperlinkCard: (cardId, hubId) => {
    const state = get();
    if (state.phase !== "browsing") return;

    const hub = state.playerBoard.find((c) => c.instanceId === hubId && c.isHub);
    const card = state.playerBoard.find((c) => c.instanceId === cardId && !c.linkedTo && c.instanceId !== hubId);

    if (!hub || !card) return;

    // Same TLD check
    if (getTld(hub.url) !== getTld(card.url)) return;

    const currentLinks = state.hyperlinks[hubId] ?? [];
    if (currentLinks.length >= hub.baseConnection) return; // at capacity

    const newHyperlinks = {
      ...state.hyperlinks,
      [hubId]: [...currentLinks, cardId],
    };

    const newBoard = state.playerBoard.map((c) =>
      c.instanceId === cardId ? { ...c, linkedTo: hubId } : c
    );

    set({ hyperlinks: newHyperlinks, playerBoard: newBoard, selectedCard: null });
  },

  attackWithCard: (attackerId, targetId) => {
    const state = get();
    if (state.phase !== "execution") return;

    const attacker = state.playerBoard.find((c) => c.instanceId === attackerId);
    if (!attacker || attacker.isTapped) return;

    // Combined ATK: hub + all linked cards
    let totalAtk = attacker.baseAttack;
    if (attacker.isHub) {
      const linkedIds = state.hyperlinks[attackerId] ?? [];
      linkedIds.forEach((lid) => {
        const linked = state.playerBoard.find((c) => c.instanceId === lid);
        if (linked) totalAtk += linked.baseAttack;
      });
    }

    let opponentBW = state.opponentBW;
    let opponentBoard = [...state.opponentBoard];
    const browsingHistory = [...state.browsingHistory];
    let hyperlinks = { ...state.hyperlinks };

    if (targetId === "sysadmin") {
      // Check for opponent Firewall
      const hasFirewall = opponentBoard.some((c) => c.isFirewall);
      if (hasFirewall) return; // blocked

      opponentBW -= totalAtk;
    } else {
      const targetIdx = opponentBoard.findIndex((c) => c.instanceId === targetId);
      if (targetIdx === -1) return;

      const target = opponentBoard[targetIdx];
      const newHP = target.currentHealth - totalAtk;

      if (newHP <= 0) {
        browsingHistory.push(target);
        opponentBoard = opponentBoard.filter((c) => c.instanceId !== targetId);

        // 404: if hub destroyed, linked cards go too
        if (target.isHub) {
          const linked = hyperlinks[target.instanceId] ?? [];
          linked.forEach((lid) => {
            const linkedCard = opponentBoard.find((c) => c.instanceId === lid);
            if (linkedCard) browsingHistory.push(linkedCard);
          });
          opponentBoard = opponentBoard.filter(
            (c) => !(hyperlinks[target.instanceId] ?? []).includes(c.instanceId)
          );
          delete hyperlinks[target.instanceId];
        }
      } else {
        opponentBoard[targetIdx] = { ...target, currentHealth: newHP };
      }
    }

    // Tap attacker (and all linked cards if hub)
    let playerBoard = state.playerBoard.map((c) =>
      c.instanceId === attackerId ? { ...c, isTapped: true } : c
    );
    if (attacker.isHub) {
      const linkedIds = hyperlinks[attackerId] ?? [];
      playerBoard = playerBoard.map((c) =>
        linkedIds.includes(c.instanceId) ? { ...c, isTapped: true } : c
      );
    }

    const phase: Phase = opponentBW <= 0 ? "victory" : state.phase;

    set({
      opponentBW,
      opponentBoard,
      playerBoard,
      browsingHistory,
      hyperlinks,
      phase,
      selectedCard: null,
    });
  },

  selectCard: (instanceId) => set({ selectedCard: instanceId }),

  resetGame: () =>
    set({
      playerBW: 100,
      opponentBW: 100,
      turn: 1,
      phase: "idle",
      playerCache: [],
      playerHand: [],
      playerBoard: [],
      opponentCache: [],
      opponentHand: [],
      opponentBoard: [],
      browsingHistory: [],
      hyperlinks: {},
      selectedCard: null,
    }),
}));
