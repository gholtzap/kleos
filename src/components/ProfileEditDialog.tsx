import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useState, type FormEvent } from "react";
import { appColors } from "../app-tokens.stylex";
import type {
  AccountIdentity,
  EditableProfile,
} from "../types/profile";
import { dialogStyles } from "./dialog-styles";

const MOBILE = "@media (max-width: 480px)";

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
        <Dialog.Overlay {...stylex.props(dialogStyles.overlay)} />
        <Dialog.Content {...stylex.props(dialogStyles.dialog, styles.dialog)}>
          <header {...stylex.props(dialogStyles.header)}>
            <Dialog.Close
              {...stylex.props(dialogStyles.primaryButton, dialogStyles.closeButton, dialogStyles.focusRing)}
              aria-label="Close edit profile"
              type="button"
            >
              <XIcon aria-hidden="true" size={20} />
            </Dialog.Close>
            <Dialog.Title {...stylex.props(dialogStyles.title)}>Edit profile</Dialog.Title>
            <button
              {...stylex.props(dialogStyles.primaryButton, dialogStyles.focusRing)}
              form="profile-editor-form"
              type="submit"
            >
              Save
            </button>
          </header>

          <Dialog.Description {...stylex.props(styles.description)}>
            The name and username come from the signed-in account for {account.handle}.
          </Dialog.Description>

          <form
            {...stylex.props(styles.form)}
            id="profile-editor-form"
            onSubmit={submit}
          >
            <label {...stylex.props(styles.label)} htmlFor="profile-editor-bio">
              <span>Bio</span>
              <textarea
                {...stylex.props(styles.field, styles.textarea)}
                id="profile-editor-bio"
                maxLength={160}
                onChange={(event) => setBio(event.currentTarget.value)}
                rows={4}
                value={bio}
              />
            </label>

            <label {...stylex.props(styles.label)} htmlFor="profile-editor-website">
              <span>Website</span>
              <input
                {...stylex.props(styles.field)}
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

const styles = stylex.create({
  dialog: {
    maxHeight: { default: "min(650px, calc(100dvh - 32px))", [MOBILE]: "100dvh" },
    width: { default: "min(600px, calc(100% - 32px))", [MOBILE]: "100%" },
    borderLeftWidth: { default: 1, [MOBILE]: 0 },
    borderRightWidth: { default: 1, [MOBILE]: 0 },
    borderRadius: { default: 16, [MOBILE]: 0 },
  },
  description: {
    margin: 0,
    paddingBlockStart: 16,
    paddingInline: 20,
    color: appColors.muted,
    fontSize: 14,
    lineHeight: "18px",
  },
  form: { display: "grid", padding: 20, gap: 20 },
  label: {
    display: "grid",
    gap: 7,
    color: appColors.muted,
    fontSize: 13,
    lineHeight: "16px",
  },
  field: {
    width: "100%",
    padding: 12,
    color: appColors.text,
    backgroundColor: "transparent",
    borderColor: "#536471",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 4,
    font: "inherit",
    fontSize: 15,
    lineHeight: "20px",
    outlineColor: { default: null, ":focus": appColors.blue },
    outlineStyle: { default: null, ":focus": "solid" },
    outlineWidth: { default: null, ":focus": 2 },
    outlineOffset: { default: null, ":focus": 2 },
  },
  textarea: { minHeight: 104, resize: "vertical" },
});
