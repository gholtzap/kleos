import { useAuth } from "@clerk/react";
import { useEffect, useMemo, useState } from "react";
import {
  emptyProfileRecord,
  getOwnProfileRecord,
  ProfileConflictError,
  saveOwnProfileRecord,
} from "../profile-record";
import type { KleosRecord } from "../types";
import type { AccountIdentity } from "../types/profile";

export interface ProfileRecordStore {
  /** Null until the stored record loads, and for members who have none yet. */
  record: KleosRecord | null;
  loaded: boolean;
  /** The record to edit: the stored one, or an empty record for a new member. */
  base: KleosRecord;
  saving: boolean;
  saveError: string;
  clearSaveError: () => void;
  save: (next: KleosRecord) => Promise<boolean>;
}

/**
 * Owns one member's stored Kleos record for a screen: the initial load, the
 * save, and the reload that a revision conflict needs. Screens keep their own
 * status messages, because only they know what a save meant.
 */
export function useProfileRecord(account: AccountIdentity): ProfileRecordStore {
  const { getToken } = useAuth();
  const [record, setRecord] = useState<KleosRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getOwnProfileRecord(getToken, controller.signal)
      .then((stored) => {
        if (controller.signal.aborted) return;
        if (stored) setRecord(stored);
        setLoaded(true);
      })
      .catch(() => {
        // The screen still renders without the stored record; saving retries
        // the load through the conflict path.
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [getToken]);

  async function save(next: KleosRecord): Promise<boolean> {
    setSaving(true);
    setSaveError("");
    try {
      setRecord(await saveOwnProfileRecord(next, getToken));
      return true;
    } catch (error) {
      if (error instanceof ProfileConflictError) {
        try {
          setRecord(await getOwnProfileRecord(getToken));
        } catch {
          // Keep the stale record when the reload fails; the next save retries.
        }
      }
      setSaveError(
        error instanceof Error ? error.message : "Could not save your profile.",
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Stable across renders, so callers can compare an edited record with the one
  // they started from.
  const base = useMemo(
    () => record ?? emptyProfileRecord(account),
    [account.handle, account.id, account.name, record],
  );

  return {
    record,
    loaded,
    base,
    saving,
    saveError,
    clearSaveError: () => setSaveError(""),
    save,
  };
}
