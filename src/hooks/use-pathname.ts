import { useEffect, useState } from "react";
import { navigationEvent } from "../navigation";

/** The active path, following both history buttons and in-app navigation. */
export function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", updatePathname);
    window.addEventListener(navigationEvent, updatePathname);
    // A navigation may have landed between the first render and this effect.
    updatePathname();
    return () => {
      window.removeEventListener("popstate", updatePathname);
      window.removeEventListener(navigationEvent, updatePathname);
    };
  }, []);

  return pathname;
}
