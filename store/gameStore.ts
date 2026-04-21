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
}

interface GameState {
  // Battle state
  playerHP: number;
  opponentHP: number;
  playerConnections: number;
  maxConnections: number;
  turn: number;
  phase: "idle" | "main" | "combat" | "end" | "victory" | "defeat";
  playerHand: CardInstance[];
  playerBoard: BattlefieldCard[];
  opponentBoard: BattlefieldCard[];
  graveyard: CardInstance[];
  selectedCard: string | null;

  // Actions
  startGame: (deck: CardInstance[]) => void;
  playCard: (instanceId: string) => void;
  attackWithCard: (attackerId: string, targetId: string | "sysadmin") => void;
  endTurn: () => void;
  selectCard: (instanceId: string | null) => void;
  resetGame: () => void;
}

function calcConnectionCost(attack: number, def: number): number {
  return Math.max(1, Math.round((attack + def) / 3));
}

function createOpponentDeck(): BattlefieldCard[] {
  const aiDomains = [
    { url: "evil-corp.com", attack: 4, health: 6, factions: ["Tech"] },
    { url: "hacknet.io", attack: 6, health: 4, factions: ["Tech"] },
    { url: "botfarm.net", attack: 3, health: 3, factions: ["Neutral"] },
    { url: "phisher.biz", attack: 5, health: 3, factions: ["E-Commerce"] },
  ];

  return aiDomains.map((d, i) => ({
    instanceId: `ai-${i}`,
    url: d.url,
    rarity: "COMMON" as const,
    baseAttack: d.attack,
    baseDef: d.health,
    baseConnection: 30,
    factions: d.factions,
    currentHealth: d.health,
    isTapped: false,
    position: "opponent" as const,
    dateAcquired: new Date().toISOString(),
  }));
}

export const useGameStore = create<GameState>((set, get) => ({
  playerHP: 30,
  opponentHP: 30,
  playerConnections: 1,
  maxConnections: 1,
  turn: 1,
  phase: "idle",
  playerHand: [],
  playerBoard: [],
  opponentBoard: [],
  graveyard: [],
  selectedCard: null,

  startGame: (deck) => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    const hand = shuffled.slice(0, 5);
    const opponentBoard = createOpponentDeck().slice(0, 2);

    set({
      playerHP: 30,
      opponentHP: 30,
      playerConnections: 1,
      maxConnections: 1,
      turn: 1,
      phase: "main",
      playerHand: hand,
      playerBoard: [],
      opponentBoard,
      graveyard: [],
      selectedCard: null,
    });
  },

  playCard: (instanceId) => {
    const state = get();
    if (state.phase !== "main") return;

    const card = state.playerHand.find((c) => c.instanceId === instanceId);
    if (!card) return;

    const cost = calcConnectionCost(card.baseAttack, card.baseDef);
    if (state.playerConnections < cost) return;

    const boardCard: BattlefieldCard = {
      ...card,
      currentHealth: card.baseDef,
      isTapped: false,
      position: "player",
    };

    set({
      playerHand: state.playerHand.filter((c) => c.instanceId !== instanceId),
      playerBoard: [...state.playerBoard, boardCard],
      playerConnections: state.playerConnections - cost,
      selectedCard: null,
    });
  },

  attackWithCard: (attackerId, targetId) => {
    const state = get();
    const attacker = state.playerBoard.find((c) => c.instanceId === attackerId);
    if (!attacker || attacker.isTapped) return;

    let newOpponentHP = state.opponentHP;
    let newOpponentBoard = [...state.opponentBoard];
    const newGraveyard = [...state.graveyard];

    if (targetId === "sysadmin") {
      newOpponentHP -= attacker.baseAttack;
    } else {
      const targetIdx = newOpponentBoard.findIndex((c) => c.instanceId === targetId);
      if (targetIdx === -1) return;

      const target = newOpponentBoard[targetIdx];
      const newTargetHP = target.currentHealth - attacker.baseAttack;

      if (newTargetHP <= 0) {
        newGraveyard.push(target);
        newOpponentBoard = newOpponentBoard.filter((c) => c.instanceId !== targetId);
      } else {
        newOpponentBoard[targetIdx] = { ...target, currentHealth: newTargetHP };
      }
    }

    const newPlayerBoard = state.playerBoard.map((c) =>
      c.instanceId === attackerId ? { ...c, isTapped: true } : c
    );

    const phase = newOpponentHP <= 0 ? "victory" : state.phase;

    set({
      opponentHP: newOpponentHP,
      opponentBoard: newOpponentBoard,
      playerBoard: newPlayerBoard,
      graveyard: newGraveyard,
      phase,
      selectedCard: null,
    });
  },

  endTurn: () => {
    const state = get();
    if (state.phase === "victory" || state.phase === "defeat") return;

    // Simple AI: attack player or cards
    let newPlayerHP = state.playerHP;
    let newPlayerBoard = [...state.playerBoard];
    const newGraveyard = [...state.graveyard];

    state.opponentBoard.forEach((aiCard) => {
      if (newPlayerBoard.length > 0) {
        const targetIdx = Math.floor(Math.random() * newPlayerBoard.length);
        const target = newPlayerBoard[targetIdx];
        const newTargetHP = target.currentHealth - aiCard.baseAttack;

        if (newTargetHP <= 0) {
          newGraveyard.push(target);
          newPlayerBoard = newPlayerBoard.filter((c) => c.instanceId !== target.instanceId);
        } else {
          newPlayerBoard[targetIdx] = { ...target, currentHealth: newTargetHP };
        }
      } else {
        newPlayerHP -= aiCard.baseAttack;
      }
    });

    const nextTurn = state.turn + 1;
    const nextConnections = Math.min(nextTurn, 10);

    const phase: GameState["phase"] =
      newPlayerHP <= 0 ? "defeat" : "main";

    // Untap all player cards
    const untappedBoard = state.playerBoard
      .filter((c) => newPlayerBoard.some((b) => b.instanceId === c.instanceId))
      .map((c) => ({ ...c, isTapped: false, currentHealth: newPlayerBoard.find(b => b.instanceId === c.instanceId)?.currentHealth ?? c.currentHealth }));

    set({
      playerHP: newPlayerHP,
      playerBoard: untappedBoard,
      graveyard: newGraveyard,
      turn: nextTurn,
      playerConnections: nextConnections,
      maxConnections: nextConnections,
      phase,
    });
  },

  selectCard: (instanceId) => set({ selectedCard: instanceId }),

  resetGame: () =>
    set({
      playerHP: 30,
      opponentHP: 30,
      playerConnections: 1,
      maxConnections: 1,
      turn: 1,
      phase: "idle",
      playerHand: [],
      playerBoard: [],
      opponentBoard: [],
      graveyard: [],
      selectedCard: null,
    }),
}));
