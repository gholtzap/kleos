import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type {
  XAccountIdentity,
  XEditableProfile,
} from "../types/x-profile";
import "./x-profile-edit-dialog.css";

interface XProfileEditDialogProps {
  account: XAccountIdentity;
  profile: XEditableProfile;
  onCancel: () => void;
  onSave: (profile: XEditableProfile) => void;
}

export function XProfileEditDialog({
  account,
  profile,
  onCancel,
  onSave,
}: XProfileEditDialogProps) {
  const [bio, setBio] = useState(profile.bio);
  const [website, setWebsite] = useState(profile.website);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ bio: bio.trim(), website: website.trim() });
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="x-profile-editor__overlay" />
        <Dialog.Content className="x-profile-editor__dialog">
          <header className="x-profile-editor__header">
            <Dialog.Close aria-label="Close edit profile" type="button">
              <XIcon aria-hidden="true" size={20} />
            </Dialog.Close>
            <Dialog.Title>Edit profile</Dialog.Title>
            <button form="x-profile-editor-form" type="submit">
              Save
            </button>
          </header>

          <Dialog.Description className="x-profile-editor__description">
            The name and username come from the signed-in account for {account.handle}.
          </Dialog.Description>

          <form
            id="x-profile-editor-form"
            className="x-profile-editor__form"
            onSubmit={submit}
          >
            <label htmlFor="x-profile-editor-bio">
              <span>Bio</span>
              <textarea
                id="x-profile-editor-bio"
                maxLength={160}
                onChange={(event) => setBio(event.currentTarget.value)}
                rows={4}
                value={bio}
              />
            </label>

            <label htmlFor="x-profile-editor-website">
              <span>Website</span>
              <input
                id="x-profile-editor-website"
                inputMode="url"
                maxLength={100}
                onChange={(event) => setWebsite(event.currentTarget.value)}
                type="text"
                value={website}
              />
            </label>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
