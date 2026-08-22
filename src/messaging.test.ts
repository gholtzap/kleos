import { describe, expect, it } from "vitest";
import {
  isConversationId,
  messagePreview,
  normalizeConversationSummary,
  normalizeInboxSnapshot,
  normalizeMessage,
  normalizeMessageDelta,
  normalizeMessagePage,
  normalizeNewConversation,
  normalizeNewMessage,
  totalUnread,
} from "./messaging";

const conversationId = "3f1a2b4c-5d6e-4f70-8901-23456789abcd";
const messageId = "a1b2c3d4-e5f6-4a7b-9c8d-0e1f2a3b4c5d";
const author = { id: "user-1", name: "Maya Chen", handle: "@maya" };

const textMessage = {
  id: messageId,
  conversationId,
  sequence: 4,
  kind: "text",
  author,
  body: "Sounds good — Thursday works.",
  createdAt: "2026-08-20T10:00:00.000Z",
};

const outreachHeader = {
  kind: "Hiring",
  role: "Staff infrastructure engineer",
  organization: "Northwind",
  industry: "Fintech",
  location: "Remote",
  employmentType: "Full-time",
  baseCompensation: { min: 190_000, max: 230_000, currency: "USD" },
};

const summary = {
  id: conversationId,
  counterpart: author,
  lane: "opportunities",
  state: "pending",
  lastMessageAt: "2026-08-20T10:00:00.000Z",
  lastSequence: 4,
  lastReadSequence: 2,
  unreadCount: 2,
  muted: false,
};

describe("isConversationId", () => {
  it("accepts a conversation id and nothing that merely looks like one", () => {
    expect(isConversationId(conversationId)).toBe(true);
    // /messages/new must never parse as a thread.
    for (const value of ["new", "", "../../etc", conversationId + "x", 7, null]) {
      expect(isConversationId(value)).toBe(false);
    }
  });
});

describe("normalizeMessage", () => {
  it("accepts a plain text message", () => {
    expect(normalizeMessage(textMessage)).toMatchObject({
      id: messageId,
      sequence: 4,
      kind: "text",
      body: "Sounds good — Thursday works.",
    });
  });

  it("accepts an outreach message carrying its header", () => {
    const message = normalizeMessage({
      ...textMessage,
      sequence: 1,
      kind: "outreach",
      outreach: outreachHeader,
    });
    expect(message?.outreach).toMatchObject({ kind: "Hiring", industry: "Fintech" });
  });

  it("accepts a system notice, which has no author", () => {
    const message = normalizeMessage({
      ...textMessage,
      kind: "notice",
      author: undefined,
      notice: "accepted",
      body: "",
    });
    expect(message).toMatchObject({ kind: "notice", notice: "accepted" });
    expect(message?.author).toBeUndefined();
  });

  it("rejects a shape that disagrees with its kind", () => {
    // These mirror the CHECK constraints on folio_messages, so a row that could
    // not exist in the database cannot be rendered either.
    const contradictions = [
      { ...textMessage, kind: "outreach" }, // outreach without a header
      { ...textMessage, outreach: outreachHeader }, // text carrying a header
      { ...textMessage, kind: "notice", notice: "accepted" }, // notice with an author
      { ...textMessage, kind: "notice", author: undefined }, // notice without a notice
      { ...textMessage, notice: "accepted" }, // text carrying a notice
      { ...textMessage, author: undefined }, // text without an author
    ];
    for (const value of contradictions) {
      expect(normalizeMessage(value)).toBeNull();
    }
  });

  it("rejects a malformed identifier, sequence, date, or body", () => {
    const malformed = [
      { ...textMessage, id: "not-a-uuid" },
      { ...textMessage, conversationId: "new" },
      { ...textMessage, sequence: 0 },
      { ...textMessage, sequence: -1 },
      { ...textMessage, sequence: 1.5 },
      { ...textMessage, createdAt: "not a date" },
      { ...textMessage, body: "x".repeat(5_001) },
      { ...textMessage, kind: "shout" },
      { ...textMessage, author: { id: "user-1" } },
      null,
      "message",
    ];
    for (const value of malformed) {
      expect(normalizeMessage(value)).toBeNull();
    }
  });

  it("drops an unknown outreach vocabulary rather than trusting it", () => {
    const message = normalizeMessage({
      ...textMessage,
      kind: "outreach",
      outreach: { ...outreachHeader, industry: "Astrology" },
    });
    expect(message?.outreach?.industry).toBeUndefined();
  });
});

describe("normalizeConversationSummary", () => {
  it("accepts a well-formed row", () => {
    expect(normalizeConversationSummary(summary)).toMatchObject({
      id: conversationId,
      lane: "opportunities",
      unreadCount: 2,
    });
  });

  it("rejects a read watermark past the end of the conversation", () => {
    // Unread is lastSequence - lastReadSequence, so this would go negative.
    expect(
      normalizeConversationSummary({ ...summary, lastReadSequence: 5 }),
    ).toBeNull();
  });

  it("rejects an unknown lane or state", () => {
    expect(normalizeConversationSummary({ ...summary, lane: "spam" })).toBeNull();
    expect(normalizeConversationSummary({ ...summary, state: "maybe" })).toBeNull();
  });
});

describe("page and delta normalizers", () => {
  it("rejects a page when any single item is invalid", () => {
    expect(normalizeMessagePage({ items: [textMessage] })).toMatchObject({
      items: [{ sequence: 4 }],
    });
    expect(
      normalizeMessagePage({ items: [textMessage, { ...textMessage, sequence: 0 }] }),
    ).toBeNull();
    expect(normalizeMessagePage({ items: [], nextCursor: 7 })).toBeNull();
  });

  it("normalizes a thread delta", () => {
    expect(
      normalizeMessageDelta({
        conversationId,
        messages: [textMessage],
        latestSequence: 4,
        counterpartReadSequence: 3,
      }),
    ).toMatchObject({ latestSequence: 4, counterpartReadSequence: 3 });
    expect(
      normalizeMessageDelta({
        conversationId,
        messages: [{ ...textMessage, kind: "shout" }],
        latestSequence: 4,
        counterpartReadSequence: 3,
      }),
    ).toBeNull();
  });

  it("normalizes an inbox snapshot and totals its unread counts", () => {
    const snapshot = normalizeInboxSnapshot({
      conversations: [summary],
      unread: { primary: 1, requests: 2, opportunities: 3 },
    });
    expect(snapshot?.conversations).toHaveLength(1);
    expect(totalUnread(snapshot!.unread)).toBe(6);
    expect(
      normalizeInboxSnapshot({ conversations: [], unread: { primary: 1 } }),
    ).toBeNull();
  });
});

describe("outbound normalizers", () => {
  it("trims a message and refuses an empty or oversized one", () => {
    expect(
      normalizeNewMessage({ id: messageId, conversationId, body: "  hello  " }),
    ).toEqual({ id: messageId, conversationId, body: "hello" });
    for (const body of ["", "   ", "x".repeat(5_001)]) {
      expect(normalizeNewMessage({ id: messageId, conversationId, body })).toBeNull();
    }
    // A server-minted id would break the idempotent retry, so it is required.
    expect(normalizeNewMessage({ conversationId, body: "hi" })).toBeNull();
  });

  it("accepts a recipient handle with or without its leading marker", () => {
    const opened = normalizeNewConversation({
      messageId,
      recipientHandle: "@Maya",
      outreach: outreachHeader,
      body: "  Would you be open to a conversation?  ",
    });
    expect(opened).toMatchObject({
      recipientHandle: "maya",
      body: "Would you be open to a conversation?",
    });
  });

  it("refuses a handle that could be read as a path", () => {
    for (const recipientHandle of ["", "  ", "@", "maya/../admin", "a?b", "x#y"]) {
      expect(
        normalizeNewConversation({
          messageId,
          recipientHandle,
          outreach: outreachHeader,
          body: "hello",
        }),
      ).toBeNull();
    }
  });

  it("refuses to open a conversation without a declaration", () => {
    expect(
      normalizeNewConversation({
        messageId,
        recipientHandle: "maya",
        body: "hey",
      }),
    ).toBeNull();
  });
});

describe("messagePreview", () => {
  it("collapses whitespace and caps the length", () => {
    expect(messagePreview("  hello\n\n  there  ")).toBe("hello there");
    expect(messagePreview("x".repeat(400))).toHaveLength(300);
  });
});
