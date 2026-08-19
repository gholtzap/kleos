import { SealCheckIcon } from "@phosphor-icons/react";
import type { AccountConnection, ConnectionProvider } from "../lib/connections";
import "./settings-page.css";

/**
 * Each provider's own mark, so a row is recognizable at a glance. Typing the
 * map by provider means a new connection cannot ship without one.
 */
const providerLogos: Record<ConnectionProvider, string> = {
  github: "/provider-logos/github.svg",
  google: "/provider-logos/google.svg",
  x: "/provider-logos/x.svg",
  apple: "/provider-logos/apple.svg",
};

/** Marks that carry required brand colors, rather than taking the row's. */
const fullColorLogos: readonly ConnectionProvider[] = ["google"];

export function connectionStatus(connection: AccountConnection): string {
  if (!connection.connected) return "Not connected";
  if (!connection.verified) return "Finish connecting";
  const identifier = connection.username
    ? `@${connection.username}`
    : connection.emailAddress;
  return identifier ? `Connected · ${identifier}` : "Connected";
}

interface ConnectionRowProps {
  connection: AccountConnection;
  busy: boolean;
  /** False while this is the only way the member can sign back in. */
  canDisconnect: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function ConnectionRow({
  connection,
  busy,
  canDisconnect,
  onConnect,
  onDisconnect,
}: ConnectionRowProps) {
  const fullColor = fullColorLogos.includes(connection.provider);

  return (
    <li>
      <span aria-hidden="true" className="settings-page__connection-icon">
        <img
          alt=""
          className={`settings-page__connection-logo${fullColor ? " settings-page__connection-logo--native" : ""}`}
          src={providerLogos[connection.provider]}
        />
      </span>
      <span className="settings-page__connection-body">
        <strong>
          {connection.label}
          {connection.verified ? (
            <SealCheckIcon aria-label="Verified" size={14} weight="fill" />
          ) : null}
        </strong>
        <span className="settings-page__connection-status">
          {connectionStatus(connection)}
        </span>
        <span className="settings-page__connection-purpose">
          {connection.purpose}
        </span>
      </span>
      <span className="settings-page__connection-actions">
        {connection.verified ? (
          <button
            disabled={busy || !canDisconnect}
            onClick={onDisconnect}
            title={
              canDisconnect
                ? undefined
                : "Connect another account before you remove your only sign-in method."
            }
            type="button"
          >
            Disconnect
          </button>
        ) : (
          <button
            className="settings-page__connect"
            disabled={busy}
            onClick={onConnect}
            type="button"
          >
            {connection.connected ? "Reconnect" : "Connect"}
          </button>
        )}
      </span>
    </li>
  );
}
