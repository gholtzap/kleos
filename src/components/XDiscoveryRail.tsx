import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import "./x-discovery-rail.css";

export function XDiscoveryRail() {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <aside aria-label="Discover" className="x-discovery-rail">
      <form className="x-discovery-search" onSubmit={submitSearch} role="search">
        <label className="x-discovery-rail__hidden-label" htmlFor="x-discovery-search">
          Search
        </label>
        <MagnifyingGlassIcon aria-hidden="true" size={18} />
        <input id="x-discovery-search" placeholder="Search" type="search" />
      </form>
    </aside>
  );
}
