import {
  ArrowRightIcon,
  CheckIcon,
  FolderLockIcon,
  LockKeyIcon,
  PlusIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { mergeOwnerEvidence, validEvidenceSourceUrl } from "./folio";
import type { Claim, Evidence, Ownership, Profession } from "./types";
import { Button, Dialog, Field } from "./ui";

const professionPrompts: Record<Profession, string> = {
  Engineering: "Name the system, your technical ownership, production scale, and reliability, performance, cost, or security outcome.",
  Product: "Name the problem you owned, decisions you made, what shipped, and the adoption or business outcome.",
  Design: "Name the research and design ownership, what shipped, and the usability, accessibility, or customer outcome.",
  Sales: "Name the customer segment, your sales-cycle ownership, deal complexity, and verified commercial outcome.",
  Recruiting: "Name the roles, search difficulty, process ownership, time-to-hire, acceptance, or quality outcome.",
  Operations: "Name the process you owned, the operating problem, and the efficiency, cost, quality, or risk outcome.",
  Management: "Name the team context, organizational challenge, and delivery, hiring, retention, or development outcome.",
};

interface EvidenceDraft {
  evidence: Evidence;
  submitForReview: boolean;
}

export function ProveClaimDialog({
  open,
  claim,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  claim: Claim | null;
  onOpenChange: (open: boolean) => void;
  onSave: (claim: Claim) => Promise<boolean>;
}) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profession, setProfession] = useState<Profession>("Engineering");
  const [ownership, setOwnership] = useState<Ownership>("Lead");
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [organization, setOrganization] = useState("");
  const [contribution, setContribution] = useState("");
  const [outcome, setOutcome] = useState("");
  const [context, setContext] = useState("");
  const [period, setPeriod] = useState("");
  const [privacy, setPrivacy] = useState<Claim["privacy"]>("Public");
  const [hideOrganization, setHideOrganization] = useState(false);
  const [evidenceDrafts, setEvidenceDrafts] = useState<EvidenceDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSaving(false);
    setErrors({});
    setProfession(claim?.profession ?? "Engineering");
    setOwnership(claim?.ownership ?? "Lead");
    setTitle(claim?.title ?? "");
    setProject(claim?.project ?? "");
    setOrganization(claim?.organization ?? "");
    setContribution(claim?.contribution ?? "");
    setOutcome(claim?.outcome ?? "");
    setContext(claim?.outcomeContext ?? "");
    setPeriod(claim?.period ?? "");
    setPrivacy(claim?.privacy ?? "Public");
    setHideOrganization(claim?.organizationHidden ?? false);
    setEvidenceDrafts(
      claim?.evidence.map((evidence) => ({
        evidence,
        submitForReview:
          evidence.reviewStatus === "Pending" ||
          evidence.reviewStatus === "Confirmed",
      })) ?? [],
    );
  }, [claim, open]);

  const next = () => {
    const nextErrors: Record<string, string> = {};
    if (step === 1) {
      if (!title.trim()) nextErrors.title = "Name the specific contribution.";
      if (!project.trim()) nextErrors.project = "Add the project or body of work.";
    }
    if (step === 2) {
      if (contribution.trim().length < 30)
        nextErrors.contribution = "Describe your personal contribution in at least 30 characters.";
      if (outcome.trim().length < 15)
        nextErrors.outcome = "Add a concrete outcome with enough context to understand it.";
      if (context.trim().length < 15)
        nextErrors.context = "Explain how and when the outcome was measured.";
    }
    if (step === 3) {
      evidenceDrafts.forEach(({ evidence }, index) => {
        if (!evidence.title.trim()) {
          nextErrors[`evidence-title-${index}`] = "Name this evidence.";
        }
        if (!evidence.detail.trim() && !evidence.sourceUrl?.trim()) {
          nextErrors[`evidence-detail-${index}`] =
            "Add a source link or enough detail for review.";
        }
        if (
          evidence.sourceUrl &&
          !validEvidenceSourceUrl(evidence.sourceUrl)
        ) {
          nextErrors[`evidence-url-${index}`] =
            "Use a valid http or https link.";
        }
      });
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      setStep((value) => Math.min(4, value + 1));
    }
  };

  const updateEvidence = (
    index: number,
    update: (draft: EvidenceDraft) => EvidenceDraft,
  ) => {
    setEvidenceDrafts((items) =>
      items.map((item, itemIndex) => (itemIndex === index ? update(item) : item)),
    );
  };

  const addEvidence = () => {
    const now = new Date().toISOString();
    setEvidenceDrafts((items) => [
      ...items,
      {
        evidence: {
          id: `evidence-${crypto.randomUUID()}`,
          title: "",
          type: "Artifact",
          detail: "",
          access: "Private",
          reviewStatus: "Not submitted",
          updatedAt: now,
        },
        submitForReview: false,
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    const evidence = evidenceDrafts.map((draft) => {
      const original = claim?.evidence.find(
        (item) => item.id === draft.evidence.id,
      );
      const clean: Evidence = {
        ...draft.evidence,
        title: draft.evidence.title.trim(),
        sourceUrl: draft.evidence.sourceUrl?.trim() || undefined,
        detail: draft.evidence.detail.trim(),
        updatedAt: now,
        redacted: undefined,
      };
      return mergeOwnerEvidence(original, {
        ...clean,
        reviewStatus: draft.submitForReview
          ? ("Pending" as const)
          : ("Not submitted" as const),
      });
    });
    const saved = await onSave({
      id: claim?.id ?? `claim-${crypto.randomUUID()}`,
      title: title.trim(),
      project: project.trim(),
      organization: organization.trim() || "Independent work",
      organizationHidden: hideOrganization,
      profession,
      ownership,
      contribution: contribution.trim(),
      outcome: outcome.trim(),
      outcomeContext: context.trim(),
      period: period.trim() || String(new Date().getFullYear()),
      privacy,
      evidence,
      featured: claim?.featured ?? true,
    });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={claim ? "Edit proven claim" : "Prove a claim"}
      description="Record the work, measured outcome, supporting evidence, and visibility in one place."
      wide
    >
      <form onSubmit={(event) => event.preventDefault()}>
        <div className="stepper" aria-label={`Step ${step} of 4`}>
          {["Claim", "Outcome", "Evidence", "Visibility"].map((label, index) => (
            <div key={label} className={step >= index + 1 ? "active" : ""}>
              <span>{step > index + 1 ? <CheckIcon size={13} /> : index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div className="form-section">
            <Field label="Professional lens" htmlFor="claim-profession" helper={professionPrompts[profession]}>
              <select
                id="claim-profession"
                value={profession}
                onChange={(event) => setProfession(event.target.value as Profession)}
              >
                {Object.keys(professionPrompts).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Claim title" htmlFor="claim-title" error={errors.title}>
              <input
                id="claim-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Led the migration of a critical production system"
              />
            </Field>
            <div className="form-grid">
              <Field label="Project or body of work" htmlFor="claim-project" error={errors.project}>
                <input
                  id="claim-project"
                  value={project}
                  onChange={(event) => setProject(event.target.value)}
                  placeholder="Payments platform migration"
                />
              </Field>
              <Field label="Organization" htmlFor="claim-organization" helper="You can hide this in step 4.">
                <input
                  id="claim-organization"
                  value={organization}
                  onChange={(event) => setOrganization(event.target.value)}
                  placeholder="Organization name"
                />
              </Field>
            </div>
            <Field label="Ownership level" htmlFor="claim-ownership">
              <select
                id="claim-ownership"
                value={ownership}
                onChange={(event) => setOwnership(event.target.value as Ownership)}
              >
                <option>Contributor</option>
                <option>Major contributor</option>
                <option>Lead</option>
                <option>Accountable owner</option>
              </select>
            </Field>
            <Field
              label="Period"
              htmlFor="claim-period"
              helper="Use a year or a clear date range."
            >
              <input
                id="claim-period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="Jan 2025 — Jun 2026"
              />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="form-section">
            <div className="form-guidance">
              <SparkleIcon size={20} />
              <div>
                <strong>Separate your work from the team’s work.</strong>
                <span>{professionPrompts[profession]}</span>
              </div>
            </div>
            <Field
              label="What did you personally contribute?"
              htmlFor="claim-contribution"
              helper="Use first-person ownership: decisions, systems, processes, research, or coordination you directly handled."
              error={errors.contribution}
            >
              <textarea
                id="claim-contribution"
                rows={5}
                value={contribution}
                onChange={(event) => setContribution(event.target.value)}
                placeholder="I defined the migration path, built the compatibility layer, and coordinated..."
              />
            </Field>
            <Field
              label="What outcome followed?"
              htmlFor="claim-outcome"
              error={errors.outcome}
            >
              <textarea
                id="claim-outcome"
                rows={3}
                value={outcome}
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="Reduced median processing time by 38–44%..."
              />
            </Field>
            <Field
              label="Measurement context"
              htmlFor="claim-context"
              helper="Include scale, time period, method, and whether the result is exact or shown as a range."
              error={errors.context}
            >
              <textarea
                id="claim-context"
                rows={3}
                value={context}
                onChange={(event) => setContext(event.target.value)}
                placeholder="Measured across 1.7M annual transactions during the first 90 days..."
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="form-section">
            <div className="form-guidance">
              <FolderLockIcon size={20} />
              <div>
                <strong>Evidence is private unless you make it public.</strong>
                <span>
                  A claim is Draft without evidence, Supported with usable evidence,
                  and Confirmed after in-house review.
                </span>
              </div>
            </div>
            {evidenceDrafts.map((draft, index) => (
              <section className="evidence-editor" key={draft.evidence.id}>
                <div className="evidence-editor-heading">
                  <strong>Evidence {index + 1}</strong>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEvidenceDrafts((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
                <div className="form-grid">
                  <Field
                    label="Title"
                    htmlFor={`evidence-title-${index}`}
                    error={errors[`evidence-title-${index}`]}
                  >
                    <input
                      id={`evidence-title-${index}`}
                      value={draft.evidence.title}
                      onChange={(event) =>
                        updateEvidence(index, (item) => ({
                          ...item,
                          evidence: {
                            ...item.evidence,
                            title: event.target.value,
                          },
                        }))
                      }
                      placeholder="Architecture decision record"
                    />
                  </Field>
                  <Field
                    label="Evidence type"
                    htmlFor={`evidence-type-${index}`}
                  >
                    <select
                      id={`evidence-type-${index}`}
                      value={draft.evidence.type}
                      onChange={(event) =>
                        updateEvidence(index, (item) => ({
                          ...item,
                          evidence: {
                            ...item.evidence,
                            type: event.target.value as Evidence["type"],
                          },
                        }))
                      }
                    >
                      <option>Artifact</option>
                      <option>System record</option>
                      <option>Organization</option>
                      <option>Outcome</option>
                    </select>
                  </Field>
                </div>
                <Field
                  label="Source link"
                  htmlFor={`evidence-url-${index}`}
                  helper="Optional when the written detail is sufficient for review."
                  error={errors[`evidence-url-${index}`]}
                >
                  <input
                    id={`evidence-url-${index}`}
                    type="url"
                    value={draft.evidence.sourceUrl ?? ""}
                    onChange={(event) =>
                      updateEvidence(index, (item) => ({
                        ...item,
                        evidence: {
                          ...item.evidence,
                          sourceUrl: event.target.value,
                        },
                      }))
                    }
                    placeholder="https://..."
                  />
                </Field>
                <Field
                  label="Evidence detail"
                  htmlFor={`evidence-detail-${index}`}
                  helper="Explain what this source confirms and where the reviewer should look."
                  error={errors[`evidence-detail-${index}`]}
                >
                  <textarea
                    id={`evidence-detail-${index}`}
                    rows={3}
                    value={draft.evidence.detail}
                    onChange={(event) =>
                      updateEvidence(index, (item) => ({
                        ...item,
                        evidence: {
                          ...item.evidence,
                          detail: event.target.value,
                        },
                      }))
                    }
                  />
                </Field>
                <div className="form-grid">
                  <Field
                    label="Default visibility"
                    htmlFor={`evidence-access-${index}`}
                    helper="A controlled link can include a private item when you select it."
                  >
                    <select
                      id={`evidence-access-${index}`}
                      value={draft.evidence.access}
                      onChange={(event) =>
                        updateEvidence(index, (item) => ({
                          ...item,
                          evidence: {
                            ...item.evidence,
                            access: event.target.value as Evidence["access"],
                          },
                        }))
                      }
                    >
                      <option>Private</option>
                      <option>Public</option>
                    </select>
                  </Field>
                  <div className="evidence-review-control">
                    <span className="field-label">In-house review</span>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={draft.submitForReview}
                        onChange={(event) =>
                          updateEvidence(index, (item) => ({
                            ...item,
                            submitForReview: event.target.checked,
                          }))
                        }
                      />
                      <span>
                        <strong>
                          {draft.evidence.reviewStatus === "Rejected"
                            ? "Resubmit for review"
                            : "Submit for review"}
                        </strong>
                        <small>
                          {draft.evidence.reviewStatus === "Confirmed"
                            ? "Confirmed evidence stays confirmed unless its review content changes."
                            : "The claim becomes Confirmed only after an in-house reviewer accepts this evidence."}
                        </small>
                      </span>
                    </label>
                  </div>
                </div>
                {draft.evidence.reviewNote ? (
                  <p className="field-helper">
                    Review note: {draft.evidence.reviewNote}
                  </p>
                ) : null}
              </section>
            ))}
            <Button variant="outline" onClick={addEvidence}>
              <PlusIcon size={16} />
              Add evidence
            </Button>
            {!evidenceDrafts.length ? (
              <p className="field-helper">
                You can save without evidence. The claim will remain Draft.
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="form-section">
            <div className="privacy-choice-group">
              <span className="field-label">Claim visibility</span>
              {(["Public", "Restricted", "Private"] as const).map((option) => (
                <label key={option} className={privacy === option ? "selected" : ""}>
                  <input
                    type="radio"
                    name="privacy"
                    value={option}
                    checked={privacy === option}
                    onChange={() => setPrivacy(option)}
                  />
                  <span>
                    <strong>{option}</strong>
                    <small>
                      {option === "Public"
                        ? "Anyone can view the claim. Evidence can remain private."
                        : option === "Restricted"
                          ? "Only approved people can view full claim details."
                          : "Visible only to you until you choose to publish."}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={hideOrganization}
                onChange={(event) => setHideOrganization(event.target.checked)}
              />
              <span>
                <strong>Hide the organization name</strong>
                <small>Show “Organization confidential” on the claim.</small>
              </span>
            </label>
            <div className="privacy-preview">
              <LockKeyIcon size={22} />
              <div>
                <strong>Claim and evidence visibility are separate.</strong>
                <span>
                  Public claims can use private evidence. Controlled review links
                  disclose only the items that you select.
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="dialog-actions">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((value) => value - 1)}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 4 ? (
            <Button key="continue" onClick={next}>
              Continue
              <ArrowRightIcon size={16} />
            </Button>
          ) : (
            <Button key="save" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save claim"}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
