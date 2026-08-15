import { useReverification, useUser } from "@clerk/react";
import { useState } from "react";
import {
  accountConnection,
  accountConnections,
  connectionDefinition,
  matchesConnectionProvider,
  type AccountConnection,
  type ConnectionProvider,
  type ConnectionStrategy,
} from "../connections";

type ClerkUser = NonNullable<ReturnType<typeof useUser>["user"]>;

export type ClerkExternalAccount = ClerkUser["externalAccounts"][number];

export interface AccountConnectionsController {
  connections: AccountConnection[];
  externalAccounts: readonly ClerkExternalAccount[];
  /** The provider whose connect or disconnect is in flight, if any. */
  pending: ConnectionProvider | null;
  connectionFor(provider: ConnectionProvider): AccountConnection;
  externalAccountFor(
    provider: ConnectionProvider,
  ): ClerkExternalAccount | undefined;
  /**
   * Starts the provider's OAuth flow and sends the browser to it, so this only
   * returns when the flow could not start. Reconnects an unfinished connection
   * instead of creating a second one.
   */
  connect(provider: ConnectionProvider, redirectUrl: string): Promise<void>;
  /** Removes the Clerk connection. Profile cleanup is the caller's job. */
  disconnect(provider: ConnectionProvider): Promise<void>;
}

/**
 * The single place Kleos links, relinks, and unlinks third-party accounts.
 * Every operation runs through Clerk reverification, so a stolen session cannot
 * add a sign-in method or drop a verified identity.
 */
export function useAccountConnections(): AccountConnectionsController {
  const { user } = useUser();
  const [pending, setPending] = useState<ConnectionProvider | null>(null);
  const createExternalAccount = useReverification(
    (strategy: ConnectionStrategy, redirectUrl: string) =>
      user?.createExternalAccount({ strategy, redirectUrl }),
  );
  const reauthorizeExternalAccount = useReverification(
    (account: ClerkExternalAccount, redirectUrl: string) =>
      account.reauthorize({ redirectUrl }),
  );
  const destroyExternalAccount = useReverification(
    (account: ClerkExternalAccount) => account.destroy(),
  );

  const externalAccounts: readonly ClerkExternalAccount[] =
    user?.externalAccounts ?? [];

  function externalAccountFor(provider: ConnectionProvider) {
    return externalAccounts.find((account) =>
      matchesConnectionProvider(account.provider, provider),
    );
  }

  async function connect(provider: ConnectionProvider, redirectUrl: string) {
    const definition = connectionDefinition(provider);
    if (!user) throw new Error("Sign in to continue.");
    const existing = externalAccountFor(provider);
    setPending(provider);
    try {
      const external = existing
        ? await reauthorizeExternalAccount(existing, redirectUrl)
        : await createExternalAccount(definition.strategy, redirectUrl);
      const redirect = external?.verification?.externalVerificationRedirectURL;
      if (!redirect) throw new Error("Missing verification redirect.");
      window.location.href = redirect.toString();
    } catch (error) {
      setPending(null);
      throw new Error(
        `Could not start ${definition.label} verification. The ${definition.label} connection may not be enabled for this app yet.`,
        { cause: error },
      );
    }
  }

  async function disconnect(provider: ConnectionProvider) {
    const definition = connectionDefinition(provider);
    const existing = externalAccountFor(provider);
    if (!existing) return;
    setPending(provider);
    try {
      await destroyExternalAccount(existing);
    } catch (error) {
      throw new Error(`Could not remove the ${definition.label} connection.`, {
        cause: error,
      });
    } finally {
      setPending(null);
    }
  }

  return {
    connections: accountConnections(externalAccounts),
    externalAccounts,
    pending,
    connectionFor: (provider) => accountConnection(externalAccounts, provider),
    externalAccountFor,
    connect,
    disconnect,
  };
}
