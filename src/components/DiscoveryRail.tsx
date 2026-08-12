import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import "./discovery-rail.css";

export function DiscoveryRail() {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <aside aria-label="Discover" className="discovery-rail">
      <form className="discovery-search" onSubmit={submitSearch} role="search">
        <label className="discovery-rail__hidden-label" htmlFor="discovery-search">
          Search
        </label>
        <MagnifyingGlassIcon aria-hidden="true" size={18} />
        <input id="discovery-search" placeholder="Search" type="search" />
      </form>
    </aside>
  );
}
