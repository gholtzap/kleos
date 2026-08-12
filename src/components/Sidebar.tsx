import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  DotsThreeIcon,
  HouseIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useState } from "react";
import type { AccountIdentity } from "../types/profile";
import { profilePath } from "../lib";
import { ComposeIcon } from "./icons";
import "./sidebar.css";

interface SidebarProps {
  account: AccountIdentity;
  activeItem: string;
  collapsible?: boolean;
  onPost: () => void;
}

interface NavigationItem {
  label: string;
  icon: Icon;
  href: string;
}

export function Sidebar({
  account,
  activeItem,
  collapsible = false,
  onPost,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const accountProfilePath = profilePath(account.handle);
  const navigationItems: readonly NavigationItem[] = [
    { label: "Home", icon: HouseIcon, href: "/home" },
    { label: "Profile", icon: UserIcon, href: accountProfilePath },
  ];

  return (
    <aside
      className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}
      id="sidebar"
    >
      <div className="sidebar__header">
        <a
          aria-label="Go to Kleos home"
          className="sidebar__logo"
          href="/home"
        >
          <span className="sidebar__wordmark">Kleos</span>
          <img alt="" className="sidebar__mark" src="/kleos-icon.svg" />
        </a>
        {collapsible ? (
          <button
            aria-controls="sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar__toggle"
            onClick={() => setCollapsed((current) => !current)}
            type="button"
          >
            {collapsed ? (
              <CaretDoubleRightIcon aria-hidden="true" size={18} />
            ) : (
              <CaretDoubleLeftIcon aria-hidden="true" size={18} />
            )}
          </button>
        ) : null}
      </div>

      <nav aria-label="Primary navigation" className="sidebar__navigation">
        <ul>
          {navigationItems.map(({ label, icon: NavigationIcon, href }) => {
            const isActive = activeItem === label;
            const content = (
              <>
                <NavigationIcon size={27} weight={isActive ? "fill" : "regular"} />
                <span>{label}</span>
              </>
            );

            return (
              <li key={label}>
                <a
                  aria-current={isActive ? "page" : undefined}
                  className="sidebar__navigation-button"
                  href={href}
                >
                  {content}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <button className="sidebar__post" onClick={onPost} type="button">
        <span>Post</span>
        <ComposeIcon />
      </button>

      <a
        aria-label={`Go to the ${account.name} profile`}
        className="sidebar__account"
        href={accountProfilePath}
      >
        <span aria-hidden="true" className="sidebar__account-avatar-placeholder" />
        <span className="sidebar__account-text">
          <strong>{account.name}</strong>
          <span>{account.handle}</span>
        </span>
        <DotsThreeIcon aria-hidden="true" size={20} weight="bold" />
      </a>
    </aside>
  );
}
