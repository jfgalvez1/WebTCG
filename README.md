# ⟨/⟩ WEB TCG — The Internet is the Battlefield

A digital-only Trading Card Game where real websites become your weapons. Turn any URL into a playable card with stats derived from domain age, traffic, and metadata.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js v5 |
| Styling | Tailwind CSS v4 (cyberpunk terminal theme) |
| State | Zustand |
| Deployment | Vercel (recommended) / any Node.js host |

## Getting Started

### 1. Prerequisites

- Node.js 20+
- PostgreSQL database (local or [Supabase](https://supabase.com))

### 2. Configure Environment

Edit `.env` with your connection string:

```env
DATABASE_URL="postgresql://user:password@host:5432/web_tcg"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

Generate a secret: `openssl rand -base64 32`

### 3. Initialize the Database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo login (after seeding): `demo@webtcg.dev` / `demo1234`

---

## Game Systems

### The Card Forge Algorithm

Every domain runs through the Forge to generate stats:

| Metric | Source | Stat |
|---|---|---|
| Domain Age | WhoisXML API / estimated | **Health** = Age (years) × 2 |
| Monthly Traffic | DataForSEO / estimated | **Attack** tiers: <10k=1, <1M=3, <100M=5, >100M=8 |
| HTML Keywords | Cheerio scraper | **Faction** tags |

### Card Rarities

| Rarity | Description | Visual |
|---|---|---|
| ◈ Genesis 1-of-1 | First mint of a domain. Unique forever. | Gold border, shimmer |
| ⌬ Clone | Subsequent mints. -1/-1 stat penalty. | Purple border |
| ◇ Common | From Booster Packs. Standard stats. | Cyan border |
| ✕ Dead Link | Reserved for unreachable domains. | Red border |

### Economy

| Currency | Source | Use |
|---|---|---|
| Standard Coins ◈ | Gameplay rewards (500 on sign-up) | Booster Packs (100 each) |
| Premium Coins ⊕ | Earned or purchased | Domain Registrar minting |

### Combat (SysAdmin vs SysAdmin)

- Both players start at **30 HP**
- **Connections** (mana) start at 1, increment each turn, cap at 10
- **Deploy cost** = `(Attack + Health) / 3` connections
- Cards can attack enemy cards or the enemy SysAdmin directly
- Attacked cards with 0 HP "Crash" to the Graveyard
- Reducing the opponent to 0 HP triggers a **Blue Screen of Death** (win)

---

## External API Integration

The app works in **demo mode** with a built-in lookup table for major domains. To enable live scraping:

1. **Domain Age:** Get a key from [WhoisXML API](https://whois.whoisxmlapi.com/)
2. **Traffic Data:** Sign up at [DataForSEO](https://dataforseo.com/)

Add keys to `.env`:

```env
WHOISXML_API_KEY="your-key"
DATAFORSEO_LOGIN="your-login"
DATAFORSEO_PASSWORD="your-password"
```

The forge logic in `lib/forge.ts` has stubs ready for these integrations.

---

## Project Structure

```
web-tcg/
├── app/
│   ├── api/              # API routes (auth, forge, booster, registrar, inventory)
│   ├── battlefield/      # Combat UI
│   ├── booster/          # Booster Pack opening
│   ├── dashboard/        # Player home
│   ├── inventory/        # Card collection viewer
│   ├── login/            # Auth pages
│   ├── register/
│   └── registrar/        # Domain minting (1-of-1 Genesis)
├── components/
│   ├── Card.tsx          # Reusable card component with all rarities
│   ├── Navbar.tsx
│   └── SessionWrapper.tsx
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── forge.ts          # Card Forge algorithm
│   └── prisma.ts         # Database client
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Demo data seeder
└── store/
    └── gameStore.ts      # Zustand battle state machine
```

## Roadmap (Post-MVP)

- [ ] Marketplace for Genesis card trading
- [ ] Spell cards: Firewall, DDoS Attack, VPN
- [ ] Real-time PvP via WebSockets / Socket.io
- [ ] Matchmaking & leaderboard
- [ ] Live API integrations (WhoisXML, DataForSEO)
