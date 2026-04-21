"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/Card";
import { useGameStore, CardInstance, BattlefieldCard } from "@/store/gameStore";

// ── Phase metadata ────────────────────────────────────────────────────────────

const PHASES = [
  { id: "taskManager", label: "Task Manager", short: "TASK" },
  { id: "refresh",     label: "Refresh",      short: "RFSH" },
  { id: "browsing",    label: "Browsing",      short: "BRWS" },
  { id: "execution",   label: "Execution",     short: "EXEC" },
  { id: "cleanup",     label: "Cleanup",       short: "CLNP" },
] as const;

const AUTO_ADVANCE = new Set(["taskManager", "refresh", "cleanup"]);

// ── BW bar helper ─────────────────────────────────────────────────────────────

function BWBar({ bw, max = 100, label }: { bw: number; max?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (bw / max) * 100));
  const color = pct > 60 ? "bg-green-500" : pct > 30 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="min-w-[140px]">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
        <span className={`font-bold text-sm ${pct <= 30 ? "text-red-400" : pct <= 60 ? "text-yellow-400" : "text-green-400"}`}>
          {bw} <span className="text-gray-600 font-normal text-xs">/ {max} BW</span>
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Phase step bar ────────────────────────────────────────────────────────────

function PhaseBar({ phase }: { phase: string }) {
  const activeIdx = PHASES.findIndex((p) => p.id === phase);
  return (
    <div className="flex items-center gap-0 text-[9px] font-mono uppercase tracking-widest">
      {PHASES.map((p, i) => {
        const isActive = p.id === phase;
        const isPast = i < activeIdx;
        return (
          <div key={p.id} className="flex items-center">
            <div
              className={`px-2 py-0.5 rounded ${
                isActive
                  ? "bg-orange-700 text-orange-100 font-bold"
                  : isPast
                  ? "text-gray-700"
                  : "text-gray-800"
              }`}
            >
              {p.short}
            </div>
            {i < PHASES.length - 1 && (
              <div className={`mx-0.5 ${isPast ? "text-gray-700" : "text-gray-900"}`}>›</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BattlefieldPage() {
  const {
    playerBW, opponentBW, turn, phase,
    playerCache, playerHand, playerBoard,
    opponentBoard, browsingHistory, hyperlinks, selectedCard,
    startGame, advancePhase, playCard, hyperlinkCard,
    attackWithCard, selectCard, resetGame,
  } = useGameStore();

  const [inventory, setInventory] = useState<CardInstance[]>([]);
  const [loadingInv, setLoadingInv] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [hyperlinkMode, setHyperlinkMode] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // Animation state
  const [lungingCardId, setLungingCardId] = useState<string | null>(null);
  const [hittingTargetId, setHittingTargetId] = useState<string | "sysadmin" | null>(null);
  const [damagePopup, setDamagePopup] = useState<{ targetId: string | "sysadmin"; amount: number; key: number } | null>(null);

  function addLog(msg: string) {
    setLog((prev) => [`[T${turn}] ${msg}`, ...prev].slice(0, 30));
  }

  useEffect(() => {
    setLoadingInv(true);
    fetch("/api/inventory")
      .then((r) => r.json())
      .then((data) => {
        const cards: CardInstance[] = (data.inventory ?? []).map((item: {
          instanceId: string; url: string; rarity: "GENESIS" | "COMMON" | "DEAD_LINK";
          dateAcquired: string; card: { baseAttack: number; baseDef: number; baseConnection: number; factions: string[] };
        }) => ({
          instanceId: item.instanceId,
          url: item.url,
          rarity: item.rarity,
          baseAttack: item.card.baseAttack,
          baseDef: item.card.baseDef,
          baseConnection: item.card.baseConnection,
          factions: item.card.factions,
          dateAcquired: item.dateAcquired,
        }));
        setInventory(cards);
      })
      .finally(() => setLoadingInv(false));
  }, []);

  // Auto-advance Task Manager and Refresh phases after a brief delay
  useEffect(() => {
    if (!AUTO_ADVANCE.has(phase)) return;
    const label = PHASES.find((p) => p.id === phase)?.label ?? phase;
    addLog(`⟩ ${label} phase — auto-resolving...`);
    const t = setTimeout(() => advancePhase(), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn]);

  function handleStartGame() {
    if (inventory.length === 0) return;
    startGame(inventory);
    setLog(["⟩ Battle initiated. SysAdmin vs SysAdmin. May the best domain win."]);
    setAttackMode(false);
    setHyperlinkMode(null);
  }

  function handlePlayCard(instanceId: string) {
    const card = playerHand.find((c) => c.instanceId === instanceId);
    if (!card) return;
    if (playerBW <= card.baseConnection) {
      addLog(`✕ Not enough BW to deploy ${card.url} (need >${card.baseConnection} BW)`);
      return;
    }
    playCard(instanceId);
    addLog(`▶ Deployed ${card.url} — cost ${card.baseConnection} BW`);
    selectCard(null);
  }

  function handleAdvancePhase() {
    if (phase === "browsing") addLog("⟩ Entering Execution phase — declare attacks.");
    if (phase === "execution") addLog("⟩ Cleanup — ending turn...");
    advancePhase();
    setAttackMode(false);
    setHyperlinkMode(null);
    selectCard(null);
  }

  function handlePlayerBoardClick(card: BattlefieldCard) {
    if (phase !== "execution" && phase !== "browsing") return;

    // Hyperlink mode: link card to hub
    if (hyperlinkMode && phase === "browsing") {
      if (card.instanceId === hyperlinkMode) {
        setHyperlinkMode(null);
        return;
      }
      hyperlinkCard(card.instanceId, hyperlinkMode);
      addLog(`🔗 Linked ${card.url} to hub`);
      setHyperlinkMode(null);
      return;
    }

    if (phase !== "execution") return;

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
      addLog(`⟩ ${card.url} ready to attack — click an enemy card or SysAdmin.`);
    }
  }

  function triggerAttackAnimation(
    attackerId: string,
    targetId: string | "sysadmin",
    damage: number,
    logMsg: string
  ) {
    setAttackMode(false);
    selectCard(null);
    setLungingCardId(attackerId);

    // Impact hits at 65% of lunge duration (~420ms)
    setTimeout(() => {
      setHittingTargetId(targetId);
      setDamagePopup({ targetId, amount: damage, key: Date.now() });
    }, 380);

    // Commit game state after lunge completes
    setTimeout(() => {
      attackWithCard(attackerId, targetId);
      setLungingCardId(null);
      addLog(logMsg);
    }, 700);

    // Clear hit effect
    setTimeout(() => {
      setHittingTargetId(null);
    }, 900);

    // Clear damage popup after it floats away
    setTimeout(() => {
      setDamagePopup(null);
    }, 1300);
  }

  function handleOpponentBoardClick(card: BattlefieldCard) {
    if (!attackMode || !selectedCard) return;
    const attacker = playerBoard.find((c) => c.instanceId === selectedCard);
    if (!attacker) return;
    const linkedAtk = attacker.isHub
      ? (hyperlinks[selectedCard] ?? []).reduce((sum, lid) => {
          const l = playerBoard.find((c) => c.instanceId === lid);
          return sum + (l?.baseAttack ?? 0);
        }, 0)
      : 0;
    const damage = attacker.baseAttack + linkedAtk;
    triggerAttackAnimation(
      selectedCard,
      card.instanceId,
      damage,
      `⚔ Attacked ${card.url} for ${damage} damage!`
    );
  }

  function handleAttackSysAdmin() {
    if (!attackMode || !selectedCard) return;
    const hasFirewall = opponentBoard.some((c) => c.isFirewall);
    if (hasFirewall) {
      addLog("🛡 BLOCKED — Enemy Firewall must be destroyed first!");
      return;
    }
    const attacker = playerBoard.find((c) => c.instanceId === selectedCard);
    const baseAtk = attacker?.baseAttack ?? 0;
    const linkedAtk = attacker?.isHub
      ? (hyperlinks[selectedCard] ?? []).reduce((sum, lid) => {
          const l = playerBoard.find((c) => c.instanceId === lid);
          return sum + (l?.baseAttack ?? 0);
        }, 0)
      : 0;
    const damage = baseAtk + linkedAtk;
    triggerAttackAnimation(
      selectedCard,
      "sysadmin",
      damage,
      `⚔ Direct attack on enemy SysAdmin for ${damage} BW damage!`
    );
  }

  // ── Idle screen ─────────────────────────────────────────────────────────────

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
              Deploy your domain cards and drain the enemy SysAdmin&apos;s Bandwidth to zero.
              Every card you play costs BW — and so does every hit you take.
            </p>

            {loadingInv ? (
              <div className="text-gray-600 text-sm">Loading your cache...</div>
            ) : inventory.length === 0 ? (
              <div>
                <p className="text-yellow-400 text-sm mb-4">
                  ⚠ No cards in inventory! Open some Booster Packs first.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-xs mb-6">
                  {inventory.length} cards in your Cache. 5 will be drawn to your starting Bookmark Bar.
                </p>
                <button
                  onClick={handleStartGame}
                  className="bg-red-900/60 hover:bg-red-800/60 border border-red-600 text-red-300 font-bold px-8 py-3 rounded-lg transition-all text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-red-900/30"
                >
                  ⚔ INITIATE BATTLE
                </button>
              </div>
            )}

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              <RuleCard
                icon="📶"
                title="Bandwidth (BW)"
                desc="You have 100 BW. Playing cards AND taking damage drains it. Hit 0 and you disconnect — you lose."
              />
              <RuleCard
                icon="🔗"
                title="Hyperlinking"
                desc="Hub cards (high CONN) can link same-TLD cards. Linked cards combine ATK. Destroy the Hub = 404 Error for all links."
              />
              <RuleCard
                icon="🛡"
                title="Firewall"
                desc=".gov / Government cards become Firewalls. Enemy SysAdmin cannot be attacked directly until all Firewalls are destroyed."
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Victory / Defeat ────────────────────────────────────────────────────────

  if (phase === "victory" || phase === "defeat") {
    return (
      <div className="min-h-screen matrix-bg flex items-center justify-center">
        <Navbar />
        <div className="text-center px-4">
          {phase === "victory" ? (
            <>
              <div className="text-yellow-400 text-6xl mb-4">✓</div>
              <h1 className="text-3xl font-bold text-yellow-400 tracking-widest mb-2">VICTORY</h1>
              <p className="text-gray-400 text-sm mb-6">Enemy SysAdmin&apos;s Bandwidth reached zero. Connection terminated.</p>
              <div className="text-green-400 text-xs font-mono mb-8 border border-green-900 bg-green-950/20 px-4 py-2 rounded">
                + 50 Standard Coins awarded
              </div>
            </>
          ) : (
            <>
              <div className="text-blue-400 text-6xl mb-4 font-bold animate-pulse">:-(</div>
              <h1 className="text-3xl font-bold text-blue-400 tracking-widest mb-2">BLUE SCREEN OF DEATH</h1>
              <p className="text-gray-400 text-sm mb-8">Your Bandwidth reached zero. Connection lost.</p>
              <div className="font-mono text-xs text-blue-300 space-y-1 border border-blue-900 bg-blue-950/20 px-6 py-4 rounded mb-8">
                <div>A problem has been detected and your SysAdmin</div>
                <div>has been shut down to prevent further damage.</div>
                <div className="mt-2">BANDWIDTH_EXCEPTION_NOT_HANDLED</div>
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

  // ── Active game ─────────────────────────────────────────────────────────────

  const opponentFirewall = opponentBoard.some((c) => c.isFirewall);
  const overloadWarning = playerBoard.length === 6;
  const isAutoPhase = AUTO_ADVANCE.has(phase);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-2 py-3 gap-2">

        {/* ── Opponent zone ──────────────────────────────────────────────── */}
        <div className="border border-red-900/30 bg-red-950/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            {/* SysAdmin avatar — animates on direct hit */}
            <div
              className={`flex items-center gap-3 ${
                attackMode && selectedCard && !opponentFirewall && !lungingCardId
                  ? "cursor-crosshair rounded p-1 target-ready"
                  : opponentFirewall
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
              onClick={handleAttackSysAdmin}
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 border-2 rounded bg-red-950/50 flex items-center justify-center text-lg
                    ${hittingTargetId === "sysadmin" ? "sysadmin-hit border-red-400 text-red-300" : "border-red-700 text-red-400"}
                  `}
                >
                  AI
                </div>
                {/* Damage popup on SysAdmin */}
                {damagePopup?.targetId === "sysadmin" && (
                  <div
                    key={damagePopup.key}
                    className="damage-float absolute -top-2 left-1/2 -translate-x-1/2 text-red-400 font-bold font-mono whitespace-nowrap"
                    style={{ fontSize: "13px" }}
                  >
                    −{damagePopup.amount} BW
                  </div>
                )}
                {/* Hit flash overlay on SysAdmin */}
                {hittingTargetId === "sysadmin" && (
                  <div className="hit-overlay rounded" />
                )}
              </div>
              <div>
                <div className="text-red-400 text-xs font-bold">ENEMY SYSADMIN</div>
                <BWBar bw={opponentBW} label="" />
              </div>
              {attackMode && selectedCard && (
                opponentFirewall ? (
                  <div className="text-orange-500 text-xs ml-2">🛡 FIREWALL ACTIVE</div>
                ) : (
                  <div className="text-red-400 text-xs animate-pulse ml-2">← Attack here</div>
                )
              )}
            </div>
            <div className="text-xs text-gray-600 text-right">
              <div>{opponentBoard.length} active tabs</div>
              <div className="text-gray-800">{browsingHistory.length} in history</div>
            </div>
          </div>

          {/* Opponent Active Tabs */}
          <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-1">
            Active Tabs ({opponentBoard.length})
          </div>
          <div className="flex flex-wrap gap-2 min-h-[120px] items-center justify-center">
            {opponentBoard.length === 0 ? (
              <div className="text-gray-800 text-xs">— No tabs open —</div>
            ) : (
              opponentBoard.map((card) => {
                const isHit = hittingTargetId === card.instanceId;
                const hasDamage = damagePopup?.targetId === card.instanceId;
                const isTargetable = !!(attackMode && selectedCard && !lungingCardId);
                return (
                  <div
                    key={card.instanceId}
                    onClick={() => handleOpponentBoardClick(card)}
                    className={[
                      "relative",
                      isTargetable ? "target-ready" : "",
                    ].join(" ")}
                  >
                    <div className={isHit ? "card-hit" : ""}>
                      <Card card={card} size="sm" dimmed={!isTargetable} />
                    </div>
                    {/* Red overlay flash on hit */}
                    {isHit && <div className="hit-overlay rounded-lg" />}
                    {/* Floating damage number */}
                    {hasDamage && (
                      <div
                        key={damagePopup!.key}
                        className="damage-float absolute -top-4 left-1/2 -translate-x-1/2 text-red-400 font-bold font-mono whitespace-nowrap"
                        style={{ fontSize: "13px" }}
                      >
                        −{damagePopup!.amount}
                      </div>
                    )}
                    {/* Crosshair overlay label when targetable */}
                    {isTargetable && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-red-400 text-lg opacity-70">⊕</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Center control bar ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border border-gray-800 rounded text-xs gap-2 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="text-gray-500">Turn <span className="text-white font-bold">{turn}</span></div>
            <PhaseBar phase={phase} />
          </div>

          <div className="flex items-center gap-2">
            {hyperlinkMode && (
              <span className="text-cyan-400 animate-pulse font-bold uppercase text-[10px]">
                🔗 Select card to link (same TLD)
              </span>
            )}
            {overloadWarning && phase === "browsing" && (
              <span className="text-yellow-400 font-bold text-[10px]">
                ⚠ 1 tab until OVERLOAD
              </span>
            )}
            {isAutoPhase ? (
              <span className="text-gray-600 text-[10px] italic">auto-resolving...</span>
            ) : (
              <button
                onClick={handleAdvancePhase}
                disabled={!!lungingCardId}
                className="bg-orange-900/60 hover:bg-orange-800/60 border border-orange-700 text-orange-300 font-bold px-4 py-1 rounded transition-all uppercase tracking-widest disabled:opacity-40"
              >
                {phase === "browsing" ? "ATTACK PHASE →" : phase === "execution" ? "END TURN →" : "NEXT →"}
              </button>
            )}
          </div>

          <div className="text-gray-600 text-right">
            Cache: <span className="text-gray-400">{playerCache.length}</span>
            <span className="mx-1">·</span>
            History: <span className="text-gray-400">{browsingHistory.length}</span>
          </div>
        </div>

        {/* ── Execution phase instruction banner ─────────────────────────── */}
        {phase === "execution" && !isAutoPhase && (
          <div className={`rounded border px-4 py-2 flex items-center justify-between gap-3 transition-all ${
            attackMode
              ? "border-red-700/60 bg-red-950/30"
              : "border-cyan-900/60 bg-cyan-950/20"
          }`}>
            <div className="flex items-center gap-2">
              {attackMode ? (
                <>
                  <span className="text-red-400 text-lg animate-pulse">⚔</span>
                  <div>
                    <div className="text-red-300 font-bold text-xs uppercase tracking-widest">Step 2 — Click an enemy card or the enemy SysAdmin to attack</div>
                    <div className="text-red-700 text-[10px] mt-0.5">
                      Attacker: <span className="text-red-400 font-mono">{playerBoard.find(c => c.instanceId === selectedCard)?.url}</span>
                      <span className="mx-1">·</span>
                      ATK: <span className="text-red-300 font-bold">{(() => {
                        const atk = playerBoard.find(c => c.instanceId === selectedCard);
                        const linked = atk?.isHub ? (hyperlinks[selectedCard!] ?? []).reduce((s, lid) => s + (playerBoard.find(c => c.instanceId === lid)?.baseAttack ?? 0), 0) : 0;
                        return (atk?.baseAttack ?? 0) + linked;
                      })()}</span>
                      <span className="ml-2 text-gray-700">— or click your card again to cancel</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-cyan-400 text-lg">⚡</span>
                  <div>
                    <div className="text-cyan-300 font-bold text-xs uppercase tracking-widest">Step 1 — Click one of your cards below to select an attacker</div>
                    <div className="text-cyan-900 text-[10px] mt-0.5">Glowing cards are ready to attack. Tapped cards have already attacked this turn.</div>
                  </div>
                </>
              )}
            </div>
            {attackMode && (
              <button
                onClick={() => { setAttackMode(false); selectCard(null); }}
                className="text-[10px] text-gray-600 hover:text-gray-400 border border-gray-800 px-2 py-0.5 rounded shrink-0"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* ── Player Active Tabs ─────────────────────────────────────────── */}
        <div className="border border-cyan-900/30 bg-cyan-950/10 rounded-lg p-3">
          <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-1">
            Active Tabs ({playerBoard.length} / 7)
            {overloadWarning && (
              <span className="text-yellow-500 ml-2">⚠ OVERLOAD IMMINENT</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 min-h-[120px] items-center justify-center mb-3">
            {playerBoard.length === 0 ? (
              <div className="text-gray-800 text-xs">— Play cards from your Bookmark Bar to open tabs here —</div>
            ) : (
              playerBoard.map((card) => {
                const isHubMode = hyperlinkMode === card.instanceId;
                const isLinked = !!card.linkedTo;
                const hubCard = isLinked ? playerBoard.find((c) => c.instanceId === card.linkedTo) : null;
                const isLunging = lungingCardId === card.instanceId;
                // Glow cyan when this card can be selected as attacker
                const isAttackReady = phase === "execution" && !card.isTapped && !attackMode && !lungingCardId;
                // Glow when this card is the selected attacker
                const isSelected = selectedCard === card.instanceId;
                return (
                  <div key={card.instanceId} className="relative" style={{ marginTop: isLinked ? "12px" : undefined }}>
                    {isLinked && hubCard && (
                      <div className="absolute -top-3 left-0 right-0 text-center text-[8px] text-cyan-600 font-mono truncate px-1">
                        🔗 {hubCard.url}
                      </div>
                    )}
                    <div
                      onClick={() => handlePlayerBoardClick(card)}
                      className={[
                        "cursor-pointer",
                        isHubMode ? "ring-2 ring-cyan-400 rounded-lg" : "",
                        isLunging ? "card-lunge" : "",
                        isAttackReady ? "attack-ready" : "",
                        isSelected ? "ring-2 ring-white rounded-lg" : "",
                      ].join(" ")}
                    >
                      <Card
                        card={card}
                        size="sm"
                        selected={isSelected}
                      />
                    </div>
                    {/* Hub: show link button if in browsing phase */}
                    {card.isHub && phase === "browsing" && !card.isTapped && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHyperlinkMode(hyperlinkMode === card.instanceId ? null : card.instanceId);
                        }}
                        className="absolute -bottom-4 left-0 right-0 mx-auto w-fit text-[8px] bg-cyan-900/70 border border-cyan-700 text-cyan-300 px-1.5 rounded hover:bg-cyan-800"
                      >
                        🔗 LINK {(hyperlinks[card.instanceId] ?? []).length}/{card.baseConnection}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Player SysAdmin */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-700 rounded bg-cyan-950/50 flex items-center justify-center text-cyan-400 text-lg">⟨/⟩</div>
            <div>
              <div className="text-cyan-400 text-xs font-bold">YOUR SYSADMIN</div>
              <BWBar bw={playerBW} label="" />
            </div>
          </div>
        </div>

        {/* ── Bookmark Bar (Hand) ────────────────────────────────────────── */}
        <div className="border border-gray-800 bg-gray-900/30 rounded-lg p-3">
          <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-2">
            Bookmark Bar ({playerHand.length} / 7 cards)
          </div>
          <div className="flex flex-wrap gap-2 items-end justify-center min-h-[80px]">
            {playerHand.length === 0 ? (
              <div className="text-gray-800 text-xs self-center">No cards in hand</div>
            ) : (
              playerHand.map((card) => {
                const canPlay = phase === "browsing" && playerBW > card.baseConnection;
                return (
                  <Card
                    key={card.instanceId}
                    card={card}
                    size="sm"
                    selected={selectedCard === card.instanceId}
                    dimmed={!canPlay}
                    connectionCost={card.baseConnection}
                    showCost
                    onClick={() => {
                      if (attackMode || hyperlinkMode) {
                        setAttackMode(false);
                        setHyperlinkMode(null);
                        selectCard(null);
                        return;
                      }
                      if (canPlay) {
                        handlePlayCard(card.instanceId);
                      } else if (phase === "browsing") {
                        addLog(`✕ Need >${card.baseConnection} BW to play ${card.url} (have ${playerBW})`);
                      }
                    }}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* ── Combat log ────────────────────────────────────────────────── */}
        <div className="border border-gray-900 bg-black/30 rounded p-2 max-h-24 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-gray-800 text-xs font-mono">— log empty —</div>
          ) : (
            log.map((entry, i) => (
              <div key={i} className="text-xs text-gray-600 font-mono">{entry}</div>
            ))
          )}
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
