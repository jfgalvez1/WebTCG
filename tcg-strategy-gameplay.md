# DOMAIN WARS: The Browser Battlefield

## Complete Game Rules and Card Creation Guide *(Bandwidth Edition)*

Welcome to **Domain Wars**, a Trading Card Game where the internet is your battlefield. In this game, your play area is a **Web Browser**, your cards are **URLs**, and your lifeblood is your **Bandwidth**. Every card you play drains your connection, forcing you to balance your desire to build a massive board against the risk of disconnecting yourself.

---

## 1. Game Objective (Win Condition)

**Force a Disconnect:** Reduce your opponent's Bandwidth (BW) from **100 to 0**. You do this by attacking them directly with your URL cards, or by forcing them to spend all their Bandwidth playing their own cards.

---

## 2. The Game Board (The Window)

The traditional TCG mat is replaced by the **Browser Window**.

| Zone | TCG Equivalent | Description |
|---|---|---|
| **Cache** | Deck | A standard 40-card deck of URLs, Extensions (Spells), and Hardware (Items). |
| **Bookmark Bar** | Hand | Maximum of 7 cards. |
| **Active Tabs** | Field | The URLs you currently have open. Hard limit of **7 Active Tabs**. If you exceed this, your browser overloads and you must immediately discard all your Active Tabs. |
| **Browsing History** | Discard Pile | Destroyed URLs, closed tabs, and resolved spells. |
| **System Monitor** | Life/Mana Tracker | Tracks your current Bandwidth, starting at exactly **100**. |

---

## 3. Core Resource: Bandwidth (BW)

Instead of a separate life pool and mana pool, you manage a **single 100 Bandwidth resource**.

- **The Cost of Browsing:** When you play a card from your Bookmark Bar to your Active Tabs, you immediately subtract its **CONN** (Connection) value from your Bandwidth.
- **Closing Tabs:** During your turn, you can voluntarily "Close a Tab" (send one of your own Active Tabs to the History) to make room on your board. You do **not** get the spent Bandwidth back.
- **Zero Bandwidth:** If your Bandwidth hits **0** for any reason (playing a card, taking combat damage, or a card effect), you **lose the game**.

---

## 4. Card Anatomy: The URL

Every URL Card features the following attributes:

| Stat | Description |
|---|---|
| **Domain/TLD** | The extension of the URL (e.g., `.com`, `.gov`), acting as its **Faction**. |
| **ATK** (Attack) | The damage it deals to enemy URLs or directly to the opponent's Bandwidth. |
| **DEF** (Defense) | The amount of damage it absorbs before being destroyed and sent to the History. |
| **CONN** (Connection) | Dual-purpose core stat. The exact amount of Bandwidth it costs to play, and how many cards can "Hyperlink" to it. |
| **Abilities** | Special effects the card executes when played or active. |

---

## 5. The Turn Structure

A player's turn consists of **5 phases**:

1. **Task Manager Phase** — Resolve any ongoing effects (like Malware drains).
2. **Refresh Phase** — Draw 1 card from your Cache. Untap any URLs that attacked last turn.
3. **Browsing Phase** *(Main Phase)* — Play URLs into your Active Tabs by deducting their CONN from your Bandwidth. You may also play Extensions, Close Tabs, or Hyperlink URLs.
4. **Execution Phase** *(Combat)* — Declare attacks. URLs can attack opponent URLs or attack the opponent's Bandwidth directly (if no "Firewall" URLs are blocking).
5. **Cleanup Phase** — Resolve end-of-turn effects. Check hand size and discard down to 7.

---

## 6. Unique Gameplay Mechanics

### Hyperlinking (The Combo System)

If you have a **"Hub" URL** on the field, you can link smaller URLs to it if they share the same TLD (e.g., both are `.com`).

- The Hub's **CONN** stat dictates the maximum number of URLs that can link to it.
- Hyperlinked cards **combine their ATK** when attacking a single target, allowing you to break through massive defenses.
- If the opponent destroys the Hub, all hyperlinked cards instantly result in a **"404 Error"** and go to the discard pile.

### Pop-Ups & Malware (Bandwidth Leaks)

Certain cards are designated as **Pop-Ups**. You can play these directly into your opponent's Active Tabs.

- When you play a Pop-Up onto the opponent's board, **you** pay the initial CONN cost from your Bandwidth.
- During the opponent's Task Manager phase, the Pop-Up **drains a set amount of Bandwidth directly from them**.
- They must waste one of their 7 Active Tab slots, or use an ability to close it, to stop the bleeding.

---

## 7. Card Creation & Balancing System

To ensure no card breaks the game, all custom URLs must follow the **Stat Budgeting System**. You buy a card's ATK, DEF, and Abilities using **Stat Points (SP)**.

> **Base Conversion:** 1 CONN = 2 Stat Points (SP)

**Stat Costs:**
- 1 ATK = 1 SP
- 1 DEF = 1 SP

### The Ability Tax

If a card has a special effect, it must "pay" for it from its SP Budget before you assign ATK and DEF.

| Ability Power | Example | Stat Point Tax |
|---|---|---|
| **Minor** | Draw 1 card when played; +1 ATK to adjacent Tab. | −1 SP |
| **Moderate** | Incognito (Played face down); Search Cache for a `.org`. | −2 SP |
| **Major** | Pop-Up (Play on enemy board); Destroy a low-CONN Tab. | −4 SP |
| **Game-Changer** | Steal an enemy Tab; Negate an attack entirely. | −6 SP |

### Rule: The Specialization Penalty

To prevent "Glass Cannon" min/maxing (e.g., a card with 15 ATK and 1 DEF):

> If more than **75%** of a card's total SP budget is spent on a single stat (ATK or DEF), its total CONN cost automatically increases by **+2 CONN**, but you do **not** receive the extra Stat Points for that increase.

---

## 8. Card Creation Example

**Card Name:** `secure-vault.gov`

| Property | Value |
|---|---|
| **CONN Cost** | 8 *(costs 8 Bandwidth to play; generates an SP Budget of 16)* |
| **Ability** | Firewall — Forces enemies to attack this card before they can attack your Bandwidth. *(Moderate Effect → Tax: −2 SP)* |
| **Remaining Budget** | 14 SP |
| **ATK** | 4 *(costs 4 SP)* |
| **DEF** | 10 *(costs 10 SP)* |

**Final Output:** `4 ATK / 10 DEF / 8 CONN`
