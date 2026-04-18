"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import { CardBack } from "@/components/Card";
import { useGameStore, CardInstance, BattlefieldCard } from "@/store/gameStore";

export default function BattlefieldPage() {
  const {
    playerHP, opponentHP, playerConnections, maxConnections, turn,
    phase, playerHand, playerBoard, opponentBoard, graveyard, selectedCard,
    startGame, playCard, attackWithCard, endTurn, selectCard, resetGame,
  } = useGameStore();

  const [inventory, setInventory] = useState<CardInstance[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [`[T${turn}] ${msg}`, ...prev].slice(0, 20));
  }

  useEffect(() => {
    setLoadingInv(true);
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        const cards: CardInstance[] = (data.inventory ?? []).map((item: {
          instanceId: string; url: string; rarity: "GENESIS" | "COMMON" | "DEAD_LINK";
          dateAcquired: string; card: { baseAttack: number; baseHealth: number; factions: string[] };
        }) => ({
          instanceId: item.instanceId,
          url: item.url,
          rarity: item.rarity,
          baseAttack: item.card.baseAttack,
          baseHealth: item.card.baseHealth,
          factions: item.card.factions,
          dateAcquired: item.dateAcquired,
        }));
        setInventory(cards);
      })
      .finally(() => setLoadingInv(false));
  }, []);

  function handleStartGame() {
    if (inventory.length === 0) return;
    startGame(inventory);
    setLog(["⟩ Battle initiated. SysAdmin vs SysAdmin. May the best domain win."]);
  }

  function handlePlayCard(instanceId: string) {
    const card = playerHand.find((c) => c.instanceId === instanceId);
    if (!card) return;
    const cost = Math.max(1, Math.round((card.baseAttack + card.baseHealth) / 3));
    if (playerConnections < cost) {
      addLog(`✕ Not enough connections to deploy ${card.url} (need ${cost})`);
      return;
    }
    playCard(instanceId);
    addLog(`▶ Deployed ${card.url} (cost: ${cost} connections)`);
    selectCard(null);
  }

  function handleBoardClick(card: BattlefieldCard) {
    if (card.position === "player") {
      if (card.isTapped) {
        addLog(`⚠ ${card.url} is already tapped.`);
        return;
      }
      if (attackMode && selectedCard === card.instanceId) {
        setAttackMode(false);
        selectCard(null);
      } else {
        selectCard(card.instanceId);
        setAttackMode(true);
        addLog(`⟩ ${card.url} ready to attack. Click enemy card or SysAdmin.`);
      }
    } else if (card.position === "opponent" && attackMode && selectedCard) {
      attackWithCard(selectedCard, card.instanceId);
      addLog(`⚔ Attacked ${card.url}!`);
      setAttackMode(false);
      selectCard(null);
    }
  }

  function handleAttackSysAdmin() {
    if (!attackMode || !selectedCard) return;
    attackWithCard(selectedCard, "sysadmin");
    const attacker = playerBoard.find((c) => c.instanceId === selectedCard);
    addLog(`⚔ Direct attack on enemy SysAdmin for ${attacker?.baseAttack ?? "?"} damage!`);
    setAttackMode(false);
    selectCard(null);
  }

  function handleEndTurn() {
    addLog("⟩ Turn ended. AI SysAdmin is attacking...");
    endTurn();
    setAttackMode(false);
    selectCard(null);
  }

  const hpBar = (hp: number, max = 30) => {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    const color = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
    return { pct, color };
  };

  if (phase === "idle") {
    return (
      <div className="min-h-screen matrix-bg">
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-red-400 text-xl">⚔</span>
            <h1 className="text-xl font-bold tracking-widest uppercase">Battlefield</h1>
          </div>

          <div className="border border-red-900/40 bg-gray-900/50 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">⚔</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2 tracking-widest">SysAdmin vs SysAdmin</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
              Deploy your domain cards and defeat the enemy SysAdmin. Each SysAdmin starts with 30 HP.
              Reduce your opponent to 0 to trigger a Blue Screen of Death.
            </p>

            {loadingInv ? (
              <div className="text-gray-600 text-sm">Loading your deck...</div>
            ) : inventory.length === 0 ? (
              <div>
                <p className="text-yellow-400 text-sm mb-4">
                  ⚠ No cards in inventory! Open some Booster Packs first.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-xs mb-6">
                  {inventory.length} cards available in your collection. 5 will be drawn to your starting hand.
                </p>
                <button
                  onClick={handleStartGame}
                  className="bg-red-900/60 hover:bg-red-800/60 border border-red-600 text-red-300 font-bold px-8 py-3 rounded-lg transition-all text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-red-900/30"
                >
                  ⚔ INITIATE BATTLE
                </button>
              </div>
            )}

            {/* Rules summary */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <RuleCard icon="⚡" title="Connections (Mana)" desc="Starts at 1 each turn, caps at 10 on turn 10. Deploy cost = (ATK + HP) / 3." />
              <RuleCard icon="⚔" title="Combat" desc="Select a card on your board, then click an enemy card or SysAdmin to attack." />
              <RuleCard icon="💀" title="Win Condition" desc="Reduce opponent SysAdmin to 0 HP to trigger Blue Screen of Death." />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (phase === "victory" || phase === "defeat") {
    return (
      <div className="min-h-screen matrix-bg flex items-center justify-center">
        <Navbar />
        <div className="text-center">
          {phase === "victory" ? (
            <>
              <div className="text-yellow-400 text-6xl mb-4">✓</div>
              <h1 className="text-3xl font-bold text-yellow-400 tracking-widest mb-2">VICTORY</h1>
              <p className="text-gray-400 text-sm mb-6">Enemy SysAdmin suffered a Blue Screen of Death.</p>
              <div className="text-green-400 text-xs font-mono mb-8 border border-green-900 bg-green-950/20 px-4 py-2 rounded">
                + 50 Standard Coins awarded
              </div>
            </>
          ) : (
            <>
              <div className="text-blue-400 text-6xl mb-4 font-bold animate-pulse">:-(</div>
              <h1 className="text-3xl font-bold text-blue-400 tracking-widest mb-2">BLUE SCREEN OF DEATH</h1>
              <p className="text-gray-400 text-sm mb-8">Your SysAdmin has crashed. Better luck next time.</p>
              <div className="font-mono text-xs text-blue-300 space-y-1 border border-blue-900 bg-blue-950/20 px-6 py-4 rounded mb-8">
                <div>A problem has been detected and your SysAdmin</div>
                <div>has been shut down to prevent damage.</div>
                <div className="mt-2">SYSADMIN_EXCEPTION_NOT_HANDLED</div>
              </div>
            </>
          )}
          <button
            onClick={resetGame}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-bold px-6 py-2 rounded transition-all text-sm uppercase tracking-widest"
          >
            ↩ RETURN TO BASE
          </button>
        </div>
      </div>
    );
  }

  const { pct: playerPct, color: playerColor } = hpBar(playerHP);
  const { pct: opponentPct, color: opponentColor } = hpBar(opponentHP);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-2 py-3 gap-2">

        {/* Opponent zone */}
        <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-3">
          {/* Opponent SysAdmin */}
          <div className="flex items-center justify-between mb-3">
            <div
              className={`flex items-center gap-3 cursor-pointer group ${attackMode && selectedCard ? "hover:ring-2 hover:ring-red-400 rounded p-1" : ""}`}
              onClick={handleAttackSysAdmin}
            >
              <div className="w-10 h-10 border-2 border-red-700 rounded bg-red-950/50 flex items-center justify-center text-red-400 text-lg">AI</div>
              <div>
                <div className="text-red-400 text-xs font-bold">ENEMY SYSADMIN</div>
                <div className="text-white font-bold">{opponentHP} HP</div>
                <div className="w-32 h-1.5 bg-gray-800 rounded-full mt-1">
                  <div className={`h-full ${opponentColor} rounded-full transition-all`} style={{ width: `${opponentPct}%` }} />
                </div>
              </div>
              {attackMode && selectedCard && (
                <div className="text-red-400 text-xs animate-pulse ml-2">← Attack here</div>
              )}
            </div>
            <div className="text-xs text-gray-600">
              <div>{opponentBoard.length} cards deployed</div>
              <div>{graveyard.length} crashed</div>
            </div>
          </div>

          {/* Opponent board */}
          <div className="flex flex-wrap gap-2 min-h-[120px] items-center justify-center">
            {opponentBoard.length === 0 ? (
              <div className="text-gray-800 text-xs">— No cards deployed —</div>
            ) : (
              opponentBoard.map((card) => (
                <div
                  key={card.instanceId}
                  onClick={() => attackMode && selectedCard ? handleBoardClick(card) : undefined}
                  className={attackMode && selectedCard ? "cursor-crosshair hover:ring-2 hover:ring-red-400 rounded-lg" : ""}
                >
                  <Card
                    card={card}
                    size="sm"
                    dimmed={!attackMode || !selectedCard}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center info bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border border-gray-800 rounded text-xs">
          <div className="flex items-center gap-4">
            <div className="text-gray-500">Turn: <span className="text-white font-bold">{turn}</span></div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">⚡</span>
              <span className="text-white font-bold">{playerConnections}</span>
              <span className="text-gray-600">/ {maxConnections} connections</span>
            </div>
          </div>

          <div className="flex gap-2">
            {attackMode && (
              <span className="text-red-400 animate-pulse font-bold uppercase">SELECT TARGET</span>
            )}
            {phase === "main" && (
              <button
                onClick={handleEndTurn}
                className="bg-orange-900/60 hover:bg-orange-800/60 border border-orange-700 text-orange-300 font-bold px-4 py-1 rounded transition-all uppercase tracking-widest"
              >
                END TURN →
              </button>
            )}
          </div>

          <div className="text-gray-500">
            Graveyard: <span className="text-gray-400">{graveyard.length}</span>
          </div>
        </div>

        {/* Player board */}
        <div className="border border-cyan-900/30 bg-cyan-950/10 rounded-lg p-3">
          <div className="flex flex-wrap gap-2 min-h-[120px] items-center justify-center mb-3">
            {playerBoard.length === 0 ? (
              <div className="text-gray-800 text-xs">— Play cards from your hand to deploy here —</div>
            ) : (
              playerBoard.map((card) => (
                <div
                  key={card.instanceId}
                  onClick={() => handleBoardClick(card)}
                  className="cursor-pointer"
                >
                  <Card
                    card={card}
                    size="sm"
                    selected={selectedCard === card.instanceId}
                  />
                </div>
              ))
            )}
          </div>

          {/* Player SysAdmin */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-cyan-700 rounded bg-cyan-950/50 flex items-center justify-center text-cyan-400 text-lg">⟨/⟩</div>
              <div>
                <div className="text-cyan-400 text-xs font-bold">YOUR SYSADMIN</div>
                <div className="text-white font-bold">{playerHP} HP</div>
                <div className="w-32 h-1.5 bg-gray-800 rounded-full mt-1">
                  <div className={`h-full ${playerColor} rounded-full transition-all`} style={{ width: `${playerPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Player hand */}
        <div className="border border-gray-800 bg-gray-900/30 rounded-lg p-3">
          <div className="text-xs text-gray-600 uppercase tracking-widest mb-2">Hand ({playerHand.length} cards)</div>
          <div className="flex flex-wrap gap-2 items-end justify-center min-h-[80px]">
            {playerHand.length === 0 ? (
              <div className="text-gray-800 text-xs self-center">No cards in hand</div>
            ) : (
              playerHand.map((card) => {
                const cost = Math.max(1, Math.round((card.baseAttack + card.baseHealth) / 3));
                const canPlay = playerConnections >= cost && phase === "main";
                return (
                  <Card
                    key={card.instanceId}
                    card={card}
                    size="sm"
                    selected={selectedCard === card.instanceId}
                    dimmed={!canPlay}
                    connectionCost={cost}
                    showCost
                    onClick={() => {
                      if (attackMode) { setAttackMode(false); selectCard(null); return; }
                      if (canPlay) {
                        handlePlayCard(card.instanceId);
                      } else {
                        addLog(`✕ Need ${cost} connections to play ${card.url}`);
                      }
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Combat log */}
        <div className="border border-gray-900 bg-black/30 rounded p-2 max-h-24 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="text-xs text-gray-600 font-mono">{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RuleCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="border border-gray-800 bg-gray-900/30 rounded p-3">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-white text-xs font-bold mb-1">{title}</div>
      <div className="text-gray-600 text-xs">{desc}</div>
    </div>
  );
}
