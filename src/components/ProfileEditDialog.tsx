import { XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import type { Person } from "../types";
import type { AccountIdentity } from "../types/profile";
import { bannerPreset, bannerPresetList } from "./ProfileHeader";
import "./profile-edit-dialog.css";
import "./profile-header.css";

export type PersonProfileUpdates = Pick<
  Person,
  "role" | "location" | "website" | "x" | "accent"
>;

interface ProfileEditDialogProps {
  account: AccountIdentity;
  person: Person;
  saving: boolean;
  saveError: string;
  onCancel: () => void;
  onSave: (updates: PersonProfileUpdates) => void;
}

const xHandlePattern = /^[A-Za-z0-9_]{1,15}$/;

function normalizedWebsite(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function ProfileEditDialog({
  account,
  person,
  saving,
  saveError,
  onCancel,
  onSave,
}: ProfileEditDialogProps) {
  const [role, setRole] = useState(person.role);
  const [location, setLocation] = useState(person.location);
  const [website, setWebsite] = useState(person.website ?? "");
  const [xHandle, setXHandle] = useState(person.x ?? "");
  const [accent, setAccent] = useState(bannerPreset(person.accent));
  const [formError, setFormError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const handle = xHandle.trim().replace(/^@+/, "");
    if (handle && !xHandlePattern.test(handle)) {
      setFormError("X usernames are 1–15 letters, numbers, or underscores.");
      return;
    }
    onSave({
      role: role.trim(),
      location: location.trim(),
      website: normalizedWebsite(website),
      x: handle || undefined,
      accent,
    });
  }

  const error = formError || saveError;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="profile-editor__overlay" />
        <Dialog.Content className="profile-editor__dialog">
          <header className="profile-editor__header">
            <Dialog.Close aria-label="Close edit profile" type="button">
              <XIcon aria-hidden="true" size={20} />
            </Dialog.Close>
            <Dialog.Title>Edit profile</Dialog.Title>
            <button disabled={saving} form="profile-editor-form" type="submit">
              {saving ? "Saving…" : "Save"}
            </button>
          </header>

          <Dialog.Description className="profile-editor__description">
            The name and username come from the signed-in account for{" "}
            {account.handle}.
          </Dialog.Description>

          <form
            className="profile-editor__form"
            id="profile-editor-form"
            onSubmit={submit}
          >
            <label htmlFor="profile-editor-role">
              <span>Headline</span>
              <input
                id="profile-editor-role"
                maxLength={300}
                onChange={(event) => setRole(event.currentTarget.value)}
                placeholder="Infrastructure engineer"
                type="text"
                value={role}
              />
            </label>

            <label htmlFor="profile-editor-location">
              <span>Location</span>
              <input
                id="profile-editor-location"
                maxLength={300}
                onChange={(event) => setLocation(event.currentTarget.value)}
                placeholder="Brooklyn, New York"
                type="text"
                value={location}
              />
            </label>

            <label htmlFor="profile-editor-website">
              <span>Website</span>
              <input
                id="profile-editor-website"
                inputMode="url"
                maxLength={2_000}
                onChange={(event) => setWebsite(event.currentTarget.value)}
                placeholder="example.com"
                type="text"
                value={website}
              />
            </label>

            <label htmlFor="profile-editor-x">
              <span>X username</span>
              <input
                id="profile-editor-x"
                maxLength={16}
                onChange={(event) => setXHandle(event.currentTarget.value)}
                placeholder="fakeperson"
                type="text"
                value={xHandle}
              />
            </label>

            <div aria-label="Banner" role="group">
              <span>Banner</span>
              <div className="profile-editor__banners">
                {bannerPresetList().map((preset) => (
                  <button
                    aria-label={`${preset} banner`}
                    aria-pressed={accent === preset}
                    className={`profile-header__banner--${preset}`}
                    key={preset}
                    onClick={() => setAccent(preset)}
                    type="button"
                  />
                ))}
              </div>
            </div>

            {error ? (
              <p className="profile-editor__error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
