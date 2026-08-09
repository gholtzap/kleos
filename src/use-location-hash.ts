import { useEffect, useState } from "react";

export function useLocationHash() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  return hash;
}
