import { useClerk, useUser } from "@clerk/react";
import { SignOutIcon } from "@phosphor-icons/react";
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
import type { AccountIdentity } from "../types/profile";
import "../app-surface.css";
import "./app-layout.css";
import { AppTopBar } from "./AppTopBar";
import { ConnectionRow } from "./ConnectionRow";
import { Sidebar } from "./Sidebar";
import { useAccountConnections } from "./use-account-connections";
import { useAppSurface } from "./use-app-surface";
import { useProfileRecord } from "./use-profile-record";
import "./settings-page.css";

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
  const hasOtherSignIn = user?.passwordEnabled === true || verifiedConnections > 1;
  const error = connectionError || saveError;

  return (
    <div className="app-surface">
      <div className="app-layout settings-page__layout">
        <div className="app-layout__sidebar">
          <Sidebar
            account={account}
            activeItem="Settings"
            collapsible
            onPost={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        </div>

        <main className="app-layout__timeline settings-page__timeline">
          <AppTopBar subtitle={account.handle} title="Settings" />

          <div className="settings-page__shell">
            <section
              aria-labelledby="settings-account-heading"
              className="settings-page__section"
            >
              <h2 id="settings-account-heading">Account</h2>
              <p className="settings-page__hint">
                Your name and username come from the account you signed in with.
              </p>
              <dl className="settings-page__facts">
                <div>
                  <dt>Name</dt>
                  <dd>{account.name}</dd>
                </div>
                <div>
                  <dt>Username</dt>
                  <dd>{account.handle}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{email ?? "No email on this account"}</dd>
                </div>
              </dl>
              <button
                className="settings-page__sign-out"
                onClick={() => void signOut()}
                type="button"
              >
                <SignOutIcon aria-hidden="true" size={16} />
                Sign out
              </button>
            </section>

            <section
              aria-labelledby="settings-connections-heading"
              className="settings-page__section"
            >
              <h2 id="settings-connections-heading">Connected accounts</h2>
              <p className="settings-page__hint">
                Connect as many as you like. Every connected account can sign
                you in, and the ones with a public username prove the links on
                your profile.
              </p>

              {error ? (
                <p className="settings-page__error" role="alert">
                  {error}
                </p>
              ) : null}

              <ul className="settings-page__connections">
                {connections.connections.map((connection) => (
                  <ConnectionRow
                    busy={saving || connections.pending === connection.provider}
                    canDisconnect={hasOtherSignIn}
                    connection={connection}
                    key={connection.provider}
                    onConnect={() => void startConnect(connection.provider)}
                    onDisconnect={() => void removeConnection(connection)}
                  />
                ))}
              </ul>
            </section>
          </div>

          <span className="settings-page__status" role="status">
            {statusMessage}
          </span>
        </main>
      </div>
    </div>
  );
}
