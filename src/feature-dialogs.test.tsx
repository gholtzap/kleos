// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { currentPerson, initialClaims } from "./data";
import { ProveClaimDialog } from "./prove-claim-dialog";
import { ShareReviewDialog } from "./share-review-dialog";

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
vi.stubGlobal(
  "fetch",
  vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }),
  ),
);

afterEach(() => {
  document.body.replaceChildren();
});

test("renders the claim and controlled-sharing workflows from feature modules", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  await act(async () => {
    root.render(
      <>
        <ProveClaimDialog
          open
          claim={null}
          onOpenChange={() => undefined}
          onSave={async () => true}
        />
        <ShareReviewDialog
          open
          onOpenChange={() => undefined}
        person={currentPerson}
        claims={initialClaims}
        revision={0}
          getToken={async () => "test-token"}
          onToast={() => undefined}
        />
      </>,
    );
  });

  expect(document.body.textContent).toContain("Prove a claim");
  expect(document.body.textContent).toContain("Share selected work");
  expect(document.body.textContent).toContain(
    "Evidence is never included automatically.",
  );

  await act(async () => root.unmount());
});
