import { XIcon } from "@phosphor-icons/react";
import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  MAX_EXPERIENCE_HIGHLIGHTS,
  newEntryId,
  validMonth,
  validYear,
} from "../lib/profile-sections";
import type {
  CertificationEntry,
  EducationEntry,
  ExperienceEntry,
  OtherExperienceEntry,
} from "../types";
import "./profile-edit-dialog.css";

type DialogSpec =
  | {
      kind: "experience";
      entry: ExperienceEntry | null;
      onSave: (entry: ExperienceEntry) => void;
    }
  | {
      kind: "education";
      entry: EducationEntry | null;
      onSave: (entry: EducationEntry) => void;
    }
  | {
      kind: "certification";
      entry: CertificationEntry | null;
      onSave: (entry: CertificationEntry) => void;
    }
  | {
      kind: "other";
      entry: OtherExperienceEntry | null;
      onSave: (entry: OtherExperienceEntry) => void;
    };

type ProfileEntryDialogProps = DialogSpec & {
  saving: boolean;
  saveError: string;
  onCancel: () => void;
  onDelete?: () => void;
};

const dialogTitles = {
  experience: "Experience",
  education: "Education",
  certification: "Certification",
  other: "Other experience",
} as const;

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

interface FieldProps {
  id: string;
  label: string;
  children: ReactNode;
}

function Field({ id, label, children }: FieldProps) {
  return (
    <label htmlFor={id}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ProfileEntryDialog(props: ProfileEntryDialogProps) {
  const { kind, saving, saveError, onCancel, onDelete } = props;
  const [values, setValues] = useState<Record<string, string>>(
    (): Record<string, string> => {
    if (props.kind === "experience" && props.entry) {
      return {
        title: props.entry.title,
        organization: props.entry.organization,
        employmentType: props.entry.employmentType ?? "",
        location: props.entry.location ?? "",
        start: props.entry.start,
        end: props.entry.end ?? "",
        highlights: props.entry.highlights.join("\n"),
      };
    }
    if (props.kind === "education" && props.entry) {
      return {
        school: props.entry.school,
        degree: props.entry.degree,
        start: props.entry.start,
        end: props.entry.end ?? "",
      };
    }
    if (props.kind === "certification" && props.entry) {
      return {
        name: props.entry.name,
        issuer: props.entry.issuer,
        issued: props.entry.issued,
        expires: props.entry.expires ?? "",
      };
    }
    if (props.kind === "other" && props.entry) {
      return {
        title: props.entry.title,
        detail: props.entry.detail ?? "",
        period: props.entry.period,
      };
    }
    return {};
    },
  );
  const [formError, setFormError] = useState("");

  function value(name: string): string {
    return values[name] ?? "";
  }

  function setValue(name: string, next: string) {
    setFormError("");
    setValues((current) => ({ ...current, [name]: next }));
  }

  function input(
    name: string,
    options: { placeholder?: string; type?: string; maxLength?: number } = {},
  ) {
    return (
      <input
        id={`entry-${name}`}
        maxLength={options.maxLength ?? 200}
        onChange={(event) => setValue(name, event.currentTarget.value)}
        placeholder={options.placeholder}
        type={options.type ?? "text"}
        value={value(name)}
      />
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = props.entry?.id ?? newEntryId();
    if (props.kind === "experience") {
      const start = value("start").trim();
      const end = value("end").trim();
      if (!value("title").trim() || !value("organization").trim()) {
        setFormError("Add a title and an organization.");
        return;
      }
      if (!validMonth(start) || (end !== "" && !validMonth(end))) {
        setFormError("Dates use the YYYY-MM format.");
        return;
      }
      const highlights = value("highlights")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, MAX_EXPERIENCE_HIGHLIGHTS);
      props.onSave({
        id,
        title: value("title").trim(),
        organization: value("organization").trim(),
        employmentType: optionalText(value("employmentType")),
        location: optionalText(value("location")),
        start,
        end: end === "" ? undefined : end,
        highlights,
      });
      return;
    }
    if (props.kind === "education") {
      const start = value("start").trim();
      const end = value("end").trim();
      if (!value("school").trim() || !value("degree").trim()) {
        setFormError("Add a school and a degree.");
        return;
      }
      if (!validYear(start) || (end !== "" && !validYear(end))) {
        setFormError("Years use the YYYY format.");
        return;
      }
      props.onSave({
        id,
        school: value("school").trim(),
        degree: value("degree").trim(),
        start,
        end: end === "" ? undefined : end,
      });
      return;
    }
    if (props.kind === "certification") {
      const issued = value("issued").trim();
      const expires = value("expires").trim();
      if (!value("name").trim() || !value("issuer").trim()) {
        setFormError("Add a certification name and an issuer.");
        return;
      }
      if (!validYear(issued) || (expires !== "" && !validYear(expires))) {
        setFormError("Years use the YYYY format.");
        return;
      }
      props.onSave({
        id,
        name: value("name").trim(),
        issuer: value("issuer").trim(),
        issued,
        expires: expires === "" ? undefined : expires,
      });
      return;
    }
    if (!value("title").trim() || !value("period").trim()) {
      setFormError("Add a title and a time period.");
      return;
    }
    props.onSave({
      id,
      title: value("title").trim(),
      detail: optionalText(value("detail")),
      period: value("period").trim(),
    });
  }

  const error = formError || saveError;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="profile-editor__overlay" />
        <Dialog.Content className="profile-editor__dialog">
          <header className="profile-editor__header">
            <Dialog.Close aria-label="Close" type="button">
              <XIcon aria-hidden="true" size={20} />
            </Dialog.Close>
            <Dialog.Title>
              {props.entry ? "Edit" : "Add"} {dialogTitles[kind].toLowerCase()}
            </Dialog.Title>
            <button disabled={saving} form="profile-entry-form" type="submit">
              {saving ? "Saving…" : "Save"}
            </button>
          </header>

          <Dialog.Description className="profile-editor__description">
            {kind === "experience"
              ? "Positions appear newest first; leave the end date empty for a current role."
              : kind === "education"
                ? "Schools and degrees appear on your profile and in the header."
                : kind === "certification"
                  ? "Licenses and certifications with an issuing organization."
                  : "Talks, open source roles, awards — anything with a date."}
          </Dialog.Description>

          <form
            className="profile-editor__form"
            id="profile-entry-form"
            onSubmit={submit}
          >
            {props.kind === "experience" ? (
              <>
                <Field id="entry-title" label="Title">
                  {input("title", { placeholder: "Software engineer" })}
                </Field>
                <Field id="entry-organization" label="Organization">
                  {input("organization")}
                </Field>
                <Field id="entry-employmentType" label="Employment type (optional)">
                  {input("employmentType", {
                    placeholder: "Full-time",
                    maxLength: 50,
                  })}
                </Field>
                <Field id="entry-location" label="Location (optional)">
                  {input("location")}
                </Field>
                <Field id="entry-start" label="Start">
                  {input("start", { type: "month" })}
                </Field>
                <Field id="entry-end" label="End (empty for present)">
                  {input("end", { type: "month" })}
                </Field>
                <Field id="entry-highlights" label="Highlights, one per line">
                  <textarea
                    id="entry-highlights"
                    maxLength={4_000}
                    onChange={(event) =>
                      setValue("highlights", event.currentTarget.value)
                    }
                    rows={4}
                    value={value("highlights")}
                  />
                </Field>
              </>
            ) : null}

            {props.kind === "education" ? (
              <>
                <Field id="entry-school" label="School">
                  {input("school")}
                </Field>
                <Field id="entry-degree" label="Degree">
                  {input("degree", { placeholder: "BS, Computer Science" })}
                </Field>
                <Field id="entry-start" label="Start year">
                  {input("start", { placeholder: "2017", maxLength: 4 })}
                </Field>
                <Field id="entry-end" label="End year (empty for present)">
                  {input("end", { placeholder: "2021", maxLength: 4 })}
                </Field>
              </>
            ) : null}

            {props.kind === "certification" ? (
              <>
                <Field id="entry-name" label="Name">
                  {input("name")}
                </Field>
                <Field id="entry-issuer" label="Issuing organization">
                  {input("issuer")}
                </Field>
                <Field id="entry-issued" label="Issue year">
                  {input("issued", { placeholder: "2024", maxLength: 4 })}
                </Field>
                <Field id="entry-expires" label="Expiry year (optional)">
                  {input("expires", { placeholder: "2027", maxLength: 4 })}
                </Field>
              </>
            ) : null}

            {props.kind === "other" ? (
              <>
                <Field id="entry-title" label="Title">
                  {input("title", { placeholder: "Speaker — PGConf NYC" })}
                </Field>
                <Field id="entry-detail" label="Detail (optional)">
                  {input("detail", { maxLength: 500 })}
                </Field>
                <Field id="entry-period" label="When">
                  {input("period", { placeholder: "2025", maxLength: 100 })}
                </Field>
              </>
            ) : null}

            {error ? (
              <p className="profile-editor__error" role="alert">
                {error}
              </p>
            ) : null}

            {props.entry && onDelete ? (
              <button
                className="profile-editor__delete"
                disabled={saving}
                onClick={onDelete}
                type="button"
              >
                Remove from profile
              </button>
            ) : null}
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
