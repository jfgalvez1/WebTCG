export interface ForgeResult {
  url: string;
  baseAttack: number;
  baseDef: number;
  baseConnection: number;
  factions: string[];
  rawMetadata: Record<string, unknown>;
  mintCost: number;
}

export function sanitizeUrl(input: string): string {
  return input
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
    .toLowerCase()
    .trim();
}

// ATK: log10 scale based on monthly traffic, bounded 1–15
// Tier mapping: Fodder 1–3 | Standard 5–7 | Boss 9–12 | Legendary 15
function calcAttack(monthlyVisits: number): number {
  const log = Math.log10(Math.max(1, monthlyVisits));
  if (log < 4) return 1;   // < 10K
  if (log < 5) return 2;   // 10K–100K
  if (log < 6) return 3;   // 100K–1M
  if (log < 7) return 5;   // 1M–10M
  if (log < 8) return 7;   // 10M–100M
  if (log < 9) return 9;   // 100M–1B
  if (log < 10) return 12; // 1B–10B
  return 15;               // 10B+
}

// DEF: domain age maps to bounded resilience, 2–14
// Tier mapping: Fodder 2–4 | Standard 6–8 | Boss 10–12 | Legendary 14
function calcDef(ageInYears: number): number {
  if (ageInYears < 2) return 2;
  if (ageInYears < 5) return 4;
  if (ageInYears < 10) return 6;
  if (ageInYears < 15) return 8;
  if (ageInYears < 20) return 10;
  if (ageInYears < 25) return 12;
  return 14;
}

// Connection: strict (ATK + DEF) / 2 base + Effect Taxes per the balancing guide.
// Glass Cannon tax: ATK heavily dominant over DEF costs extra BW to deploy.
// Firewall tax: Government cards add +3 (Firewall ability is a major board effect).
// Pop-Up tax: .biz E-Commerce low-tier cards add +1 (offset passive BW drain).
function calcConnection(atk: number, def: number, factions: string[], url: string): number {
  let base = (atk + def) / 2;

  // Glass cannon penalty
  if (atk > def * 2) base += 2;
  else if (atk > def * 1.5) base += 1;

  // Firewall effect tax (+3)
  const urlTld = url.split(".").pop() ?? "";
  const isGov = urlTld === "gov" || factions.includes("Government");
  if (isGov) base += 3;

  // Pop-Up effect tax (+1 for .biz E-Commerce Fodder cards)
  if (urlTld === "biz" && factions.includes("E-Commerce") && (atk + def) <= 8) {
    base += 1;
  }

  return Math.max(1, Math.min(95, Math.round(base)));
}

function calcFactions(keywords: string[]): string[] {
  const factions: string[] = [];
  const kw = keywords.join(" ").toLowerCase();

  if (/shop|buy|cart|store|ecommerce|commerce/.test(kw)) factions.push("E-Commerce");
  if (/news|press|media|journal|report/.test(kw)) factions.push("Media");
  if (/tech|software|code|developer|programming|api/.test(kw)) factions.push("Tech");
  if (/social|community|network|connect|friends/.test(kw)) factions.push("Social");
  if (/game|gaming|play|esport/.test(kw)) factions.push("Gaming");
  if (/finance|bank|crypto|stock|invest/.test(kw)) factions.push("Finance");
  if (/edu|learn|course|university|school/.test(kw)) factions.push("Education");
  if (/gov|government|official/.test(kw)) factions.push("Government");

  return factions.length > 0 ? factions : ["Neutral"];
}

// Mint cost in standard coins tiers aligned with ATK scale:
// Legendary (ATK 15, 10B+ visits): 50,000 | Boss (ATK 9–12, 100M–10B): 10,000
// Standard (ATK 5–7, 1M–100M): 1,000 | Fodder (ATK 2–3, 10K–1M): 200 | Trash: 50
function calcMintCost(monthlyVisits: number): number {
  if (monthlyVisits >= 10_000_000_000) return 50_000;
  if (monthlyVisits >= 100_000_000) return 10_000;
  if (monthlyVisits >= 1_000_000) return 1_000;
  if (monthlyVisits >= 10_000) return 200;
  return 50;
}

// Well-known domain mock data for demo purposes when APIs are not configured
const KNOWN_DOMAINS: Record<string, { visits: number; ageYears: number; keywords: string[] }> = {
  "google.com": { visits: 90_000_000_000, ageYears: 26, keywords: ["search", "tech", "software"] },
  "youtube.com": { visits: 35_000_000_000, ageYears: 19, keywords: ["video", "social", "media"] },
  "facebook.com": { visits: 18_000_000_000, ageYears: 20, keywords: ["social", "community", "network"] },
  "twitter.com": { visits: 6_000_000_000, ageYears: 18, keywords: ["social", "news", "media"] },
  "x.com": { visits: 6_000_000_000, ageYears: 3, keywords: ["social", "news", "media"] },
  "reddit.com": { visits: 4_000_000_000, ageYears: 19, keywords: ["social", "community", "news"] },
  "amazon.com": { visits: 3_500_000_000, ageYears: 29, keywords: ["shop", "buy", "ecommerce", "store"] },
  "wikipedia.org": { visits: 5_000_000_000, ageYears: 23, keywords: ["edu", "learn", "knowledge"] },
  "github.com": { visits: 800_000_000, ageYears: 16, keywords: ["tech", "code", "developer", "software"] },
  "netflix.com": { visits: 1_500_000_000, ageYears: 27, keywords: ["video", "media", "entertainment"] },
  "twitch.tv": { visits: 1_200_000_000, ageYears: 13, keywords: ["gaming", "game", "esport", "social"] },
  "stackoverflow.com": { visits: 600_000_000, ageYears: 17, keywords: ["tech", "developer", "code"] },
  "discord.com": { visits: 900_000_000, ageYears: 9, keywords: ["social", "gaming", "community"] },
  "tiktok.com": { visits: 10_000_000_000, ageYears: 7, keywords: ["social", "media", "video"] },
  "instagram.com": { visits: 8_000_000_000, ageYears: 14, keywords: ["social", "media", "community"] },
  "microsoft.com": { visits: 800_000_000, ageYears: 31, keywords: ["tech", "software", "developer"] },
  "apple.com": { visits: 1_000_000_000, ageYears: 28, keywords: ["tech", "software", "shop"] },
  "linkedin.com": { visits: 2_000_000_000, ageYears: 22, keywords: ["social", "network", "community"] },
  "ebay.com": { visits: 700_000_000, ageYears: 30, keywords: ["shop", "buy", "cart", "ecommerce"] },
  "nasa.gov": { visits: 150_000_000, ageYears: 29, keywords: ["gov", "science", "tech"] },
};

export async function forgeDomain(rawUrl: string): Promise<ForgeResult> {
  const url = sanitizeUrl(rawUrl);

  // Check for well-known domain mock data
  const known = KNOWN_DOMAINS[url];

  let monthlyVisits: number;
  let ageInYears: number;
  let keywords: string[];

  if (known) {
    monthlyVisits = known.visits;
    ageInYears = known.ageYears;
    keywords = known.keywords;
  } else {
    // Simulate scraping for unknown domains with plausible variation
    const seed = url.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const rng = (min: number, max: number) => min + (seed % (max - min));

    ageInYears = rng(1, 20);
    monthlyVisits = Math.pow(10, rng(3, 8));
    keywords = [];

    // Try to extract real keywords if URL hints at content
    if (url.includes("shop") || url.includes("store")) keywords.push("shop", "buy");
    if (url.includes("news") || url.includes("press")) keywords.push("news", "media");
    if (url.includes("blog") || url.includes("journal")) keywords.push("media", "learn");
    if (url.includes("game") || url.includes("play")) keywords.push("gaming", "game");
    if (url.includes("gov")) keywords.push("gov", "government");
    if (url.includes("edu")) keywords.push("edu", "learn");
    if (url.includes("tech") || url.includes("dev")) keywords.push("tech", "developer");
  }

  const baseAttack = calcAttack(monthlyVisits);
  const baseDef = calcDef(ageInYears);
  const factions = calcFactions(keywords);
  const baseConnection = calcConnection(baseAttack, baseDef, factions, url);
  const mintCost = calcMintCost(monthlyVisits);

  return {
    url,
    baseAttack,
    baseDef,
    baseConnection,
    factions,
    mintCost,
    rawMetadata: {
      monthlyVisits,
      ageInYears,
      keywords,
      source: known ? "known_domain" : "estimated",
    },
  };
}

// Predefined seed list for Booster Packs (low-to-mid tier domains)
export const BOOSTER_PACK_POOL = [
  "archive.org", "wolframalpha.com", "duckduckgo.com", "startpage.com",
  "ecosia.org", "proton.me", "signal.org", "element.io", "matrix.org",
  "codepen.io", "jsfiddle.net", "replit.com", "glitch.com", "codesandbox.io",
  "dev.to", "hashnode.com", "medium.com", "substack.com", "ghost.org",
  "wordpress.com", "blogger.com", "tumblr.com", "mastodon.social", "lemmy.world",
  "hacker-news.firebaseapp.com", "slashdot.org", "kbin.social", "diaspora.social",
  "peertube.social", "pixelfed.social", "fediverse.party", "joinpeertube.org",
  "sourcehut.org", "codeberg.org", "gitlab.com", "bitbucket.org", "gitea.io",
  "vercel.com", "netlify.com", "heroku.com", "railway.app", "fly.io",
  "cloudflare.com", "fastly.com", "akamai.com", "digitalocean.com", "linode.com",
];

export async function drawBoosterPack(): Promise<ForgeResult[]> {
  const shuffled = [...BOOSTER_PACK_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5);
  return Promise.all(selected.map(forgeDomain));
}
