import { LinkIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { claimState } from "./folio";
import { publicProfileHash } from "./public-profile";
import {
  createReviewLink,
  listReviewLinks,
  reviewLinkHash,
  revokeReviewLink,
} from "./review-links";
import type { Claim, CreatedReviewLink, Person, ReviewLinkSummary } from "./types";
import { Badge, Button, Dialog, Field } from "./ui";

export function ShareReviewDialog({
  open,
  onOpenChange,
  person,
  claims,
  revision,
  getToken,
  onToast,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person;
  claims: Claim[];
  revision: number;
  getToken: () => Promise<string | null>;
  onToast: (message: string) => void;
}) {
  const [claimIds, setClaimIds] = useState<string[]>([]);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [links, setLinks] = useState<ReviewLinkSummary[]>([]);
  const [createdUrl, setCreatedUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setCreatedUrl("");
    void getToken()
      .then((token) => {
        if (!token) throw new Error("Missing session.");
        return listReviewLinks(token);
      })
      .then(setLinks)
      .catch(() => setError("Existing review links could not be loaded."));
  }, [getToken, open]);

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onToast(message);
    } catch {
      onToast(value);
    }
  };

  const toggleClaim = (claim: Claim, selected: boolean) => {
    setClaimIds((ids) =>
      selected ? [...ids, claim.id] : ids.filter((id) => id !== claim.id),
    );
    if (!selected) {
      const claimEvidence = new Set(claim.evidence.map((item) => item.id));
      setEvidenceIds((ids) => ids.filter((id) => !claimEvidence.has(id)));
    }
  };

  const create = async () => {
    if (!claimIds.length) {
      setError("Select at least one claim.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session.");
      const created: CreatedReviewLink = await createReviewLink(token, {
        claimIds,
        evidenceIds,
        expiresInDays,
      });
      const url = `${window.location.origin}${window.location.pathname}${reviewLinkHash(created.token)}`;
      setLinks((items) => [created, ...items]);
      setCreatedUrl(url);
      await copy(url, "Controlled review link copied.");
    } catch {
      setError("The review link could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (link: ReviewLinkSummary) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session.");
      await revokeReviewLink(token, link.id);
      const revokedAt = new Date().toISOString();
      setLinks((items) =>
        items.map((item) =>
          item.id === link.id ? { ...item, revokedAt } : item,
        ),
      );
      onToast("Review link revoked.");
    } catch {
      setError("The review link could not be revoked.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Share selected work"
      description="Create a private, expiring link with only the claims and evidence that you select."
      wide
    >
      <div className="share-review-layout">
        <section className="share-selection">
          <div className="share-section-heading">
            <div>
              <strong>Select claims and evidence</strong>
              <span>Evidence is never included automatically.</span>
            </div>
          </div>
          {claims.length ? (
            <div className="share-claim-list">
              {claims.map((claim) => {
                const selected = claimIds.includes(claim.id);
                return (
                  <article
                    className={`share-claim${selected ? " selected" : ""}`}
                    key={claim.id}
                  >
                    <label className="share-claim-toggle">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={(event) =>
                          toggleClaim(claim, event.target.checked)
                        }
                      />
                      <span>
                        <strong>{claim.title}</strong>
                        <small>
                          {claimState(claim)} · {claim.privacy}
                        </small>
                      </span>
                    </label>
                    {selected && claim.evidence.length ? (
                      <div className="share-evidence-list">
                        {claim.evidence.map((evidence) => (
                          <label key={evidence.id}>
                            <input
                              type="checkbox"
                              checked={evidenceIds.includes(evidence.id)}
                              onChange={(event) =>
                                setEvidenceIds((ids) =>
                                  event.target.checked
                                    ? [...ids, evidence.id]
                                    : ids.filter((id) => id !== evidence.id),
                                )
                              }
                            />
                            <span>
                              <strong>{evidence.title}</strong>
                              <small>
                                {evidence.reviewStatus} · {evidence.access}
                              </small>
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted-copy">Add a claim before you create a review link.</p>
          )}
          <div className="share-create-row">
            <Field label="Link expires after" htmlFor="review-expiry">
              <select
                id="review-expiry"
                value={expiresInDays}
                onChange={(event) =>
                  setExpiresInDays(Number(event.target.value))
                }
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </Field>
            <Button onClick={() => void create()} disabled={saving || !claims.length}>
              <LinkIcon size={16} />
              {saving ? "Creating…" : "Create review link"}
            </Button>
          </div>
          {error ? <p className="field-error">{error}</p> : null}
          {createdUrl ? (
            <div className="created-review-link">
              <div>
                <strong>Link created</strong>
                <span>
                  Save this link now. Folio stores only its secure hash and cannot
                  show the token again.
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => void copy(createdUrl, "Review link copied.")}
              >
                Copy link
              </Button>
            </div>
          ) : null}
          <Button
            variant="ghost"
            onClick={() =>
              void copy(
                `${window.location.origin}${window.location.pathname}${publicProfileHash(person.id, revision)}`,
                "Public profile link copied.",
              )
            }
          >
            Copy public profile instead
          </Button>
        </section>

        <aside className="review-link-list">
          <div className="share-section-heading">
            <div>
              <strong>Existing links</strong>
              <span>Revoke a link at any time.</span>
            </div>
          </div>
          {links.length ? (
            links.map((link) => {
              const expired = new Date(link.expiresAt).getTime() <= Date.now();
              const inactive = Boolean(link.revokedAt) || expired;
              return (
                <article key={link.id}>
                  <div>
                    <strong>
                      {link.claimIds.length}{" "}
                      {link.claimIds.length === 1 ? "claim" : "claims"}
                    </strong>
                    <span>
                      {link.evidenceIds.length} evidence items · expires{" "}
                      {new Date(link.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Badge tone={inactive ? "neutral" : "positive"}>
                    {link.revokedAt ? "Revoked" : expired ? "Expired" : "Active"}
                  </Badge>
                  {!inactive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void revoke(link)}
                    >
                      Revoke
                    </Button>
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="muted-copy">No review links created yet.</p>
          )}
        </aside>
      </div>
    </Dialog>
  );
}
