import type { AccountIdentity, FeedPost } from "./types";

interface FixturePost {
  id: string;
  author: AccountIdentity;
  text: string;
  postedAt: string;
  replyCount: number;
  repostCount: number;
  likeCount: number;
}

export const gavinAccount = {
  id: "user_gavinholtzapple",
  name: "Gavin Holtzapple",
  handle: "@gavinholtzapple",
} satisfies AccountIdentity;

export const testAccount = {
  id: "user_kleostest26029053",
  name: "Kleos Test",
  handle: "@kleostest26029053",
} satisfies AccountIdentity;

export const mayaAccount = {
  id: "fixture_maya_chen",
  name: "Maya Chen",
  handle: "@mayamakes",
} satisfies AccountIdentity;

export const dariusAccount = {
  id: "fixture_darius_okafor",
  name: "Darius Okafor",
  handle: "@dariusbuilds",
} satisfies AccountIdentity;

export const priyaAccount = {
  id: "fixture_priya_raman",
  name: "Priya Raman",
  handle: "@priyaraman",
} satisfies AccountIdentity;

export const elenaAccount = {
  id: "fixture_elena_morales",
  name: "Elena Morales",
  handle: "@elenam",
} satisfies AccountIdentity;

export const marcusAccount = {
  id: "fixture_marcus_reed",
  name: "Marcus Reed",
  handle: "@marcusreed",
} satisfies AccountIdentity;

export const aishaAccount = {
  id: "fixture_aisha_bello",
  name: "Aisha Bello",
  handle: "@aishabello",
} satisfies AccountIdentity;

export const testAccounts = [
  gavinAccount,
  testAccount,
  mayaAccount,
  dariusAccount,
  priyaAccount,
  elenaAccount,
  marcusAccount,
  aishaAccount,
] satisfies readonly AccountIdentity[];

export const testPosts = [
  {
    id: "gavin-evidence-review",
    author: gavinAccount,
    text: "Reviewing a profile is much easier when every claim links to the work behind it. Today I tightened that path so the evidence stays close to the outcome.",
    postedAt: "4m",
    replyCount: 2,
    repostCount: 1,
    likeCount: 11,
  },
  {
    id: "aisha-cache-key-fix",
    author: aishaAccount,
    text: "Found it.\n\nThe cache key included the account ID in one worker and the email address in another. Same person, two entries, very confusing metrics.",
    postedAt: "12m",
    replyCount: 7,
    repostCount: 3,
    likeCount: 39,
  },
  {
    id: "gavin-portfolio-review",
    author: gavinAccount,
    text: "A good portfolio does more than show the final work. It explains the decisions, limits, and tradeoffs that shaped it.",
    postedAt: "18m",
    replyCount: 6,
    repostCount: 3,
    likeCount: 28,
  },
  {
    id: "marcus-design-engineer-role",
    author: marcusAccount,
    text: "I’m hiring a design engineer for a small product team. You should enjoy working across interaction design, React, and the awkward details between them. Remote in the US, with a New York overlap. Details: https://example.com/roles/design-engineer",
    postedAt: "27m",
    replyCount: 18,
    repostCount: 42,
    likeCount: 126,
  },
  {
    id: "maya-empty-state-notes",
    author: mayaAccount,
    text: "A useful empty state answers three questions: what belongs here, why it is empty, and what I can do next. If it needs a paragraph to explain itself, the surrounding flow probably needs work.",
    postedAt: "41m",
    replyCount: 5,
    repostCount: 9,
    likeCount: 74,
  },
  {
    id: "darius-deploy-recovery",
    author: dariusAccount,
    text: "We tested the database recovery runbook this morning. Restore time was 11 minutes, down from 26 last quarter. The biggest gain came from deleting two manual approval steps that did not protect anything.",
    postedAt: "1h",
    replyCount: 11,
    repostCount: 14,
    likeCount: 93,
  },
  {
    id: "priya-evaluation-split",
    author: priyaAccount,
    text: "A model can look excellent when the evaluation set shares authors with the training data. Our score dropped 8 points after we split by author instead of by document. Painful result, better experiment.",
    postedAt: "1h",
    replyCount: 9,
    repostCount: 21,
    likeCount: 108,
  },
  {
    id: "elena-client-kickoff",
    author: elenaAccount,
    text: "Kicked off a new identity project today. The first workshop produced fewer answers than questions, which is usually a good sign. Next step: talk to five customers before anyone opens a design file.",
    postedAt: "2h",
    replyCount: 3,
    repostCount: 2,
    likeCount: 31,
  },
  {
    id: "test-reliable-systems",
    author: testAccount,
    text: "The best reliability work often looks quiet: fewer manual steps, clear ownership, and a recovery path that the whole team understands.",
    postedAt: "2h",
    replyCount: 12,
    repostCount: 8,
    likeCount: 64,
  },
  {
    id: "maya-prototype-question",
    author: mayaAccount,
    text: "Designers: what do you use for prototypes that need real data and keyboard behavior? I keep reaching for a small React page because the final 10% matters most in user tests.",
    postedAt: "3h",
    replyCount: 24,
    repostCount: 4,
    likeCount: 57,
  },
  {
    id: "darius-boring-alerts",
    author: dariusAccount,
    text: "The best alert we changed this week now says which customer is affected, links to the failing job, and names the first recovery command. Alerts should help the person who wakes up, not describe the monitoring system.",
    postedAt: "4h",
    replyCount: 6,
    repostCount: 17,
    likeCount: 88,
  },
  {
    id: "priya-paper-draft",
    author: priyaAccount,
    text: "First complete draft sent to my coauthors. It is 19 pages, contains 6 figures, and has one section that still says ‘explain this better.’ Progress.",
    postedAt: "5h",
    replyCount: 13,
    repostCount: 5,
    likeCount: 82,
  },
  {
    id: "elena-scope-note",
    author: elenaAccount,
    text: "A note I now add to every proposal: ‘If the schedule gets shorter, we reduce scope before we reduce review time.’ It has prevented more problems than any project template.",
    postedAt: "6h",
    replyCount: 4,
    repostCount: 12,
    likeCount: 69,
  },
  {
    id: "marcus-customer-calls",
    author: marcusAccount,
    text: "Three customer calls this week, same request in three different forms. That is enough evidence to explore the problem, but not enough evidence to copy the first proposed solution.",
    postedAt: "7h",
    replyCount: 8,
    repostCount: 6,
    likeCount: 45,
  },
  {
    id: "aisha-small-pr",
    author: aishaAccount,
    text: "Today’s favorite pull request removed 140 lines and fixed the bug.",
    postedAt: "8h",
    replyCount: 1,
    repostCount: 7,
    likeCount: 96,
  },
  {
    id: "test-feedback-request",
    author: testAccount,
    text: "Trying the new profile flow. The evidence section feels clear on desktop, but I am not sure the primary action is easy to find on a phone. @mayamakes, would you take a look?",
    postedAt: "9h",
    replyCount: 2,
    repostCount: 0,
    likeCount: 3,
  },
  {
    id: "gavin-one-clear-boundary",
    author: gavinAccount,
    text: "A small shared boundary can prevent a surprising amount of drift. One parser, one validation rule, one error contract. Then each feature can stay focused on its actual job.",
    postedAt: "11h",
    replyCount: 10,
    repostCount: 19,
    likeCount: 117,
  },
  {
    id: "maya-mobile-review",
    author: mayaAccount,
    text: "Put the prototype on my phone before lunch and found four issues that were invisible on a large monitor:\n\n1. The close control moved under my thumb.\n2. The sheet title wrapped.\n3. The keyboard covered the save action.\n4. Focus returned to the wrong place.",
    postedAt: "13h",
    replyCount: 15,
    repostCount: 25,
    likeCount: 143,
  },
  {
    id: "darius-status-page",
    author: dariusAccount,
    text: "Status pages should say what users cannot do. ‘Elevated API errors’ is system language. ‘Some exports are delayed by up to 20 minutes’ is useful language.",
    postedAt: "16h",
    replyCount: 5,
    repostCount: 28,
    likeCount: 152,
  },
  {
    id: "priya-research-code",
    author: priyaAccount,
    text: "Released the code and evaluation data for our retrieval study: https://example.org/priya/retrieval-evaluation\n\nThe repository includes the failed approaches too. They explain the final method better than another summary chart would.",
    postedAt: "19h",
    replyCount: 21,
    repostCount: 61,
    likeCount: 204,
  },
  {
    id: "elena-invoice",
    author: elenaAccount,
    text: "Sent the final files. Sent the invoice. Updated the case study notes while the decisions were still fresh. Project complete.",
    postedAt: "22h",
    replyCount: 0,
    repostCount: 1,
    likeCount: 18,
  },
  {
    id: "marcus-roadmap",
    author: marcusAccount,
    text: "Our roadmap review got better when we replaced confidence labels with the evidence behind them. ‘High confidence’ invites debate about the label. ‘Observed in 14 of 18 sessions’ gives the team something concrete to examine.",
    postedAt: "1d",
    replyCount: 14,
    repostCount: 22,
    likeCount: 131,
  },
  {
    id: "aisha-incident-review",
    author: aishaAccount,
    text: "Incident review takeaway: the service recovered in six minutes, but support did not know for forty. Recovery and communication need separate owners, checks, and timelines.",
    postedAt: "1d",
    replyCount: 12,
    repostCount: 31,
    likeCount: 176,
  },
  {
    id: "test-first-post",
    author: testAccount,
    text: "Setting up my Kleos profile today. Starting with one project I can explain well instead of a long list with no context.",
    postedAt: "2d",
    replyCount: 0,
    repostCount: 0,
    likeCount: 1,
  },
] satisfies readonly FixturePost[];

const previewTime = Date.parse("2026-08-15T16:00:00.000Z");

export const previewPosts: readonly FeedPost[] = testPosts.map((post, index): FeedPost => ({
  id: post.id,
  author: post.author,
  body: post.text,
  media: post.id === "gavin-evidence-review" ? [{
    id: "preview-workspace",
    kind: "image",
    url: "/kleos-bg-dithered.png",
    width: 1232,
    height: 928,
    alt: "A team working together in a studio",
    animated: false,
  }] : [],
  linkPreview: post.id === "priya-research-code" ? {
    url: "https://example.org/priya/retrieval-evaluation",
    title: "Retrieval evaluation code and data",
    description: "Methods, evaluation data, and failed approaches from the study.",
    siteName: "Example research",
  } : undefined,
  postedAt: new Date(previewTime - index * 60 * 60 * 1_000).toISOString(),
  replyCount: post.replyCount,
  repostCount: post.repostCount,
  likeCount: post.likeCount,
}));
