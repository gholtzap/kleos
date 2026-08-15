import {
  GithubLogoIcon,
  GoogleLogoIcon,
  SealCheckIcon,
  XLogoIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { AccountConnection, ConnectionProvider } from "../connections";
import "./settings-page.css";

const providerIcons: Record<ConnectionProvider, Icon> = {
  github: GithubLogoIcon,
  google: GoogleLogoIcon,
  x: XLogoIcon,
};

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
  const ProviderIcon = providerIcons[connection.provider];

  return (
    <li>
      <span aria-hidden="true" className="settings-page__connection-icon">
        <ProviderIcon size={20} />
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
