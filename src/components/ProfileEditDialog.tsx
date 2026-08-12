import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import type {
  AccountIdentity,
  EditableProfile,
} from "../types/profile";
import "./profile-edit-dialog.css";

interface ProfileEditDialogProps {
  account: AccountIdentity;
  profile: EditableProfile;
  onCancel: () => void;
  onSave: (profile: EditableProfile) => void;
}

export function ProfileEditDialog({
  account,
  profile,
  onCancel,
  onSave,
}: ProfileEditDialogProps) {
  const [bio, setBio] = useState(profile.bio);
  const [website, setWebsite] = useState(profile.website);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ bio: bio.trim(), website: website.trim() });
  }

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
            <button form="profile-editor-form" type="submit">
              Save
            </button>
          </header>

          <Dialog.Description className="profile-editor__description">
            The name and username come from the signed-in account for {account.handle}.
          </Dialog.Description>

          <form
            id="profile-editor-form"
            className="profile-editor__form"
            onSubmit={submit}
          >
            <label htmlFor="profile-editor-bio">
              <span>Bio</span>
              <textarea
                id="profile-editor-bio"
                maxLength={160}
                onChange={(event) => setBio(event.currentTarget.value)}
                rows={4}
                value={bio}
              />
            </label>

            <label htmlFor="profile-editor-website">
              <span>Website</span>
              <input
                id="profile-editor-website"
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
