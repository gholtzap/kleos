import { SignOutIcon } from "@phosphor-icons/react";
import type { AccountConnection, ConnectionProvider } from "../lib/connections";
import type { AccountIdentity } from "../types";
import "../app-surface.css";
import "./app-layout.css";
import { AppTopBar } from "./AppTopBar";
import { ConnectionRow } from "./ConnectionRow";
import { Sidebar } from "./Sidebar";
import "./settings-page.css";

interface SettingsViewProps {
  account: AccountIdentity;
  email?: string;
  connections: readonly AccountConnection[];
  /** False while the member has no other way to sign back in. */
  canDisconnect: boolean;
  /** The provider whose connect or disconnect is in flight, if any. */
  pending: ConnectionProvider | null;
  saving: boolean;
  error: string;
  statusMessage: string;
  onConnect: (provider: ConnectionProvider) => void;
  onDisconnect: (connection: AccountConnection) => void;
  onSignOut: () => void;
}

/**
 * Everything the settings screen shows, as plain props. Keeping it apart from
 * the Clerk-connected page is what lets the component harness render it.
 */
export function SettingsView({
  account,
  email,
  connections,
  canDisconnect,
  pending,
  saving,
  error,
  statusMessage,
  onConnect,
  onDisconnect,
  onSignOut,
}: SettingsViewProps) {
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
                onClick={onSignOut}
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
                {connections.map((connection) => (
                  <ConnectionRow
                    busy={saving || pending === connection.provider}
                    canDisconnect={canDisconnect}
                    connection={connection}
                    key={connection.provider}
                    onConnect={() => onConnect(connection.provider)}
                    onDisconnect={() => onDisconnect(connection)}
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
