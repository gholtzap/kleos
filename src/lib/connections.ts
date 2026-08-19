import type { KleosRecord, Person } from "../types/index.js";

/**
 * Third-party accounts a member can link to their Kleos account. Connecting is
 * always an account-level act — every connection can sign you in — and a
 * connection that carries a public identity also proves the matching profile
 * field. See `identityField`.
 */
export const connectionProviders = ["github", "google", "x", "apple"] as const;

export type ConnectionProvider = (typeof connectionProviders)[number];

/**
 * Profile fields that may only hold a handle proven by a live connection. The
 * API refuses any other value, so these fields never carry an unverified claim.
 */
export const identityFields = ["github", "x"] as const;

export type IdentityField = (typeof identityFields)[number];

export type ConnectionStrategy = `oauth_${ConnectionProvider}`;

export interface ConnectionDefinition {
  readonly provider: ConnectionProvider;
  readonly label: string;
  readonly strategy: ConnectionStrategy;
  readonly purpose: string;
  /** The profile field this connection proves, when it has a public identity. */
  readonly identityField?: IdentityField;
  /** Clerk provider names that resolve to this connection. */
  readonly clerkProviders: readonly string[];
}

const definitions: Record<ConnectionProvider, ConnectionDefinition> = {
  github: {
    provider: "github",
    label: "GitHub",
    strategy: "oauth_github",
    purpose:
      "Verifies your GitHub username and lists the repositories you can feature.",
    identityField: "github",
    clerkProviders: ["github"],
  },
  google: {
    provider: "google",
    label: "Google",
    strategy: "oauth_google",
    purpose:
      "Sign in to Kleos with Google. Nothing from Google appears on your profile.",
    clerkProviders: ["google"],
  },
  x: {
    provider: "x",
    label: "X",
    strategy: "oauth_x",
    purpose: "Verifies the X username shown on your profile.",
    identityField: "x",
    // Clerk names the current connection `x` and the retired v1 one `twitter`.
    clerkProviders: ["x", "twitter"],
  },
  apple: {
    provider: "apple",
    label: "Apple",
    strategy: "oauth_apple",
    purpose:
      "Sign in to Kleos with Apple. Nothing from Apple appears on your profile.",
    clerkProviders: ["apple"],
  },
};

export function connectionDefinition(
  provider: ConnectionProvider,
): ConnectionDefinition {
  return definitions[provider];
}

export function connectionDefinitions(): readonly ConnectionDefinition[] {
  return connectionProviders.map(connectionDefinition);
}

export function identityFieldDefinition(
  field: IdentityField,
): ConnectionDefinition {
  return connectionDefinition(field);
}

export function isConnectionProvider(
  value: string,
): value is ConnectionProvider {
  return connectionProviders.some((provider) => provider === value);
}

/**
 * Clerk reports `github` in the browser and `oauth_github` on the server for
 * one and the same connection, so both spellings resolve here.
 */
export function matchesConnectionProvider(
  clerkProvider: string,
  provider: ConnectionProvider,
): boolean {
  const name = clerkProvider.trim().toLowerCase().replace(/^oauth_/, "");
  return connectionDefinition(provider).clerkProviders.includes(name);
}

/**
 * The parts of a Clerk external account Kleos reads. The browser and server
 * Clerk types both satisfy it, so connection logic stays shared.
 */
export interface ExternalAccountLike {
  readonly provider: string;
  readonly username?: string | null;
  readonly emailAddress?: string | null;
  readonly verification?: { readonly status?: string | null } | null;
}

export interface AccountConnection {
  readonly provider: ConnectionProvider;
  readonly label: string;
  readonly purpose: string;
  readonly identityField?: IdentityField;
  readonly connected: boolean;
  /** A connected account whose OAuth flow never finished is not verified. */
  readonly verified: boolean;
  readonly username?: string;
  readonly emailAddress?: string;
}

function accountFor(
  accounts: readonly ExternalAccountLike[],
  provider: ConnectionProvider,
): ExternalAccountLike | undefined {
  return accounts.find((account) =>
    matchesConnectionProvider(account.provider, provider),
  );
}

export function accountConnection(
  accounts: readonly ExternalAccountLike[],
  provider: ConnectionProvider,
): AccountConnection {
  const { label, purpose, identityField } = connectionDefinition(provider);
  const account = accountFor(accounts, provider);
  return {
    provider,
    label,
    purpose,
    identityField,
    connected: account !== undefined,
    verified: account?.verification?.status === "verified",
    username: account?.username?.trim() || undefined,
    emailAddress: account?.emailAddress?.trim() || undefined,
  };
}

export function accountConnections(
  accounts: readonly ExternalAccountLike[],
): AccountConnection[] {
  return connectionProviders.map((provider) =>
    accountConnection(accounts, provider),
  );
}

/**
 * The handle a finished connection proves, which is the only value the API
 * accepts for the matching profile field.
 */
export function verifiedIdentityUsername(
  accounts: readonly ExternalAccountLike[],
  field: IdentityField,
): string | undefined {
  const connection = accountConnection(accounts, field);
  return connection.verified ? connection.username : undefined;
}

export interface IdentityChange {
  readonly field: IdentityField;
  readonly username: string;
}

/**
 * Identity fields a verified connection would change. Absent connections never
 * produce a change: a handle is only ever cleared by disconnecting on purpose,
 * so loading a page can never quietly drop one.
 */
export function identityChanges(
  person: Person,
  accounts: readonly ExternalAccountLike[],
): IdentityChange[] {
  return identityFields.flatMap((field) => {
    const username = verifiedIdentityUsername(accounts, field);
    if (username === undefined || username === person[field]) return [];
    return [{ field, username }];
  });
}

export function recordWithVerifiedIdentities(
  record: KleosRecord,
  accounts: readonly ExternalAccountLike[],
): KleosRecord {
  const changes = identityChanges(record.person, accounts);
  if (!changes.length) return record;
  const person = { ...record.person };
  for (const change of changes) person[change.field] = change.username;
  return { ...record, person };
}

/**
 * Clears a disconnected identity. Featured projects go with the GitHub handle,
 * because a pinned project is only valid while its owner is the proven account.
 */
export function recordWithoutIdentity(
  record: KleosRecord,
  field: IdentityField,
): KleosRecord {
  return {
    ...record,
    person: { ...record.person, [field]: undefined },
    projects: field === "github" ? [] : record.projects,
  };
}
