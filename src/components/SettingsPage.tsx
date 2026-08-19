import { useClerk, useUser } from "@clerk/react";
import { useEffect, useState } from "react";
import {
  connectionDefinition,
  recordWithoutIdentity,
  recordWithVerifiedIdentities,
  type AccountConnection,
  type ConnectionProvider,
} from "../connections";
import {
  connectedProviderFromSearch,
  clearedConnectedSearch,
  settingsPath,
} from "../lib";
import type { AccountIdentity } from "../types";
import { SettingsView } from "./SettingsView";
import { useAccountConnections } from "../hooks/use-account-connections";
import { useAppSurface } from "../hooks/use-app-surface";
import { useProfileRecord } from "../hooks/use-profile-record";

interface SettingsPageProps {
  account: AccountIdentity;
}

export function SettingsPage({ account }: SettingsPageProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const profile = useProfileRecord(account);
  const connections = useAccountConnections();
  const [connectionError, setConnectionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [returnedProvider, setReturnedProvider] = useState(() =>
    connectedProviderFromSearch(window.location.search),
  );

  useAppSurface("Settings / Kleos");

  const { base, loaded, record, saving, saveError } = profile;
  const { externalAccounts } = connections;

  /**
   * A finished OAuth flow lands back here, so this is where a newly proven
   * handle reaches the profile. Providers with nothing public to prove — and
   * repeat visits — write nothing.
   */
  useEffect(() => {
    if (!loaded || !returnedProvider) return;
    setReturnedProvider(null);
    window.history.replaceState(
      null,
      "",
      `${settingsPath}${clearedConnectedSearch(window.location.search)}`,
    );
    const label = connectionDefinition(returnedProvider).label;
    const next = recordWithVerifiedIdentities(base, externalAccounts);
    if (next === base) {
      setStatusMessage(`${label} connected.`);
      return;
    }
    void profile.save(next).then((saved) => {
      if (saved) setStatusMessage(`${label} connected.`);
    });
  }, [base, externalAccounts, loaded, profile, returnedProvider]);

  async function startConnect(provider: ConnectionProvider) {
    setConnectionError("");
    setStatusMessage("");
    try {
      await connections.connect(
        provider,
        `${window.location.origin}${settingsPath}?connected=${provider}`,
      );
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : "Could not start the connection.",
      );
    }
  }

  /**
   * Clears the profile before Clerk drops the connection, so the profile never
   * shows a handle that nothing proves — the same order the projects dialog
   * uses.
   */
  async function removeConnection(connection: AccountConnection) {
    setConnectionError("");
    setStatusMessage("");
    const label = connection.label;
    if (connection.identityField && record) {
      const cleared = recordWithoutIdentity(record, connection.identityField);
      if (cleared !== record && !(await profile.save(cleared))) return;
    }
    try {
      await connections.disconnect(connection.provider);
      setStatusMessage(`${label} disconnected.`);
    } catch (error) {
      setConnectionError(
        error instanceof Error
          ? error.message
          : `Could not remove the ${label} connection.`,
      );
    }
  }

  const email = user?.primaryEmailAddress?.emailAddress;
  // Removing the only way back in would lock the member out, so that one
  // disconnect waits until another sign-in method exists.
  const verifiedConnections = connections.connections.filter(
    (connection) => connection.verified,
  ).length;
  const hasOtherSignIn =
    user?.passwordEnabled === true || verifiedConnections > 1;

  return (
    <SettingsView
      account={account}
      canDisconnect={hasOtherSignIn}
      connections={connections.connections}
      email={email}
      error={connectionError || saveError}
      onConnect={(provider) => void startConnect(provider)}
      onDisconnect={(connection) => void removeConnection(connection)}
      onSignOut={() => void signOut()}
      pending={connections.pending}
      saving={saving}
      statusMessage={statusMessage}
    />
  );
}
