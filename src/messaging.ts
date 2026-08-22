import { includesValue, isRecord } from "./guards.js";
import { normalizeOutreachHeader } from "./inbound-policy.js";
import { normalizeAccountIdentity, normalizeLinkPreview } from "./posts.js";
import { normalizeProfileHandle } from "./profile-identity.js";
import type {
  ConversationDetail,
  ConversationNotice,
  ConversationState,
  ConversationSummary,
  InboxLane,
  InboxSnapshot,
  InboxUnreadCounts,
  Message,
  MessageDelta,
  MessageKind,
  NewConversation,
  NewMessage,
  ResultPage,
} from "./types.js";

export const inboxLanes = [
  "primary",
  "requests",
  "opportunities",
  "archived",
] as const;

export const conversationStates = [
  "pending",
  "accepted",
  "declined",
  "blocked",
] as const;

export const messageKinds = ["text", "outreach", "notice"] as const;

export const conversationNotices = [
  "accepted",
  "declined",
  "blocked",
  "archived",
] as const;

/** The lanes a member actually browses. "archived" is reachable but not listed. */
export const browsableLanes: readonly InboxLane[] = [
  "primary",
  "requests",
  "opportunities",
];

export const MAX_MESSAGE_BODY_LENGTH = 5_000;
export const MAX_MESSAGE_PREVIEW_LENGTH = 300;
/** How much cold outreach one account may open in a day. */
export const OUTREACH_DAILY_LIMIT = 15;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Shared by route parsing and by the API, so a hand-edited URL cannot reach a
 * query, and "new" can never be mistaken for a conversation.
 */
export function isConversationId(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isMessageId(value: unknown): value is string {
  return isConversationId(value);
}

function isSequence(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

/** The one-line trace of a conversation shown in the inbox list. */
export function messagePreview(body: string): string {
  return body.replace(/\s+/gu, " ").trim().slice(0, MAX_MESSAGE_PREVIEW_LENGTH);
}

export function normalizeMessage(value: unknown): Message | null {
  if (
    !isRecord(value) ||
    !isMessageId(value.id) ||
    !isConversationId(value.conversationId) ||
    !isSequence(value.sequence) ||
    value.sequence < 1 ||
    !includesValue(messageKinds, value.kind) ||
    typeof value.body !== "string" ||
    value.body.length > MAX_MESSAGE_BODY_LENGTH ||
    !isIsoDate(value.createdAt) ||
    (value.editedAt !== undefined && !isIsoDate(value.editedAt))
  ) {
    return null;
  }

  const kind: MessageKind = value.kind;
  const author =
    value.author === undefined ? null : normalizeAccountIdentity(value.author);
  const notice: ConversationNotice | null = includesValue(
    conversationNotices,
    value.notice,
  )
    ? value.notice
    : null;
  const outreach =
    value.outreach === undefined ? null : normalizeOutreachHeader(value.outreach);
  const linkPreview =
    value.linkPreview === undefined
      ? null
      : normalizeLinkPreview(value.linkPreview);

  // The shape has to agree with the kind, or the thread renders something it
  // cannot explain. These mirror the CHECK constraints on folio_messages.
  if (value.author !== undefined && !author) return null;
  if (value.outreach !== undefined && !outreach) return null;
  if (value.linkPreview !== undefined && !linkPreview) return null;
  if (kind === "notice" && (!notice || author)) return null;
  if (kind !== "notice" && (notice || !author)) return null;
  if (kind === "outreach" && !outreach) return null;
  if (kind !== "outreach" && outreach) return null;

  return {
    id: value.id,
    conversationId: value.conversationId,
    sequence: value.sequence,
    kind,
    author: author ?? undefined,
    body: value.body,
    outreach: outreach ?? undefined,
    notice: notice ?? undefined,
    linkPreview: linkPreview ?? undefined,
    createdAt: value.createdAt,
    editedAt: value.editedAt,
  };
}

export function normalizeConversationSummary(
  value: unknown,
): ConversationSummary | null {
  if (
    !isRecord(value) ||
    !isConversationId(value.id) ||
    !includesValue(inboxLanes, value.lane) ||
    !includesValue(conversationStates, value.state) ||
    !isIsoDate(value.lastMessageAt) ||
    !isSequence(value.lastSequence) ||
    !isSequence(value.lastReadSequence) ||
    !isSequence(value.unreadCount) ||
    typeof value.muted !== "boolean"
  ) {
    return null;
  }
  const counterpart = normalizeAccountIdentity(value.counterpart);
  if (!counterpart) return null;
  const outreach =
    value.outreach === undefined ? null : normalizeOutreachHeader(value.outreach);
  if (value.outreach !== undefined && !outreach) return null;
  const lastMessage =
    value.lastMessage === undefined ? null : normalizeMessage(value.lastMessage);
  if (value.lastMessage !== undefined && !lastMessage) return null;
  // Reading further than the conversation goes would make unread negative.
  if (value.lastReadSequence > value.lastSequence) return null;

  const lane: InboxLane = value.lane;
  const state: ConversationState = value.state;
  return {
    id: value.id,
    counterpart,
    lane,
    state,
    outreach: outreach ?? undefined,
    lastMessage: lastMessage ?? undefined,
    lastMessageAt: value.lastMessageAt,
    lastSequence: value.lastSequence,
    lastReadSequence: value.lastReadSequence,
    unreadCount: value.unreadCount,
    muted: value.muted,
  };
}

export function normalizeConversationDetail(
  value: unknown,
): ConversationDetail | null {
  if (!isRecord(value) || !isSequence(value.counterpartReadSequence)) return null;
  const summary = normalizeConversationSummary(value.summary);
  if (!summary) return null;
  return { summary, counterpartReadSequence: value.counterpartReadSequence };
}

export function normalizeConversationPage(
  value: unknown,
): ResultPage<ConversationSummary> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items
    .map(normalizeConversationSummary)
    .filter((item): item is ConversationSummary => item !== null);
  if (
    items.length !== value.items.length ||
    (value.nextCursor !== undefined && typeof value.nextCursor !== "string")
  ) {
    return null;
  }
  return { items, nextCursor: value.nextCursor };
}

export function normalizeMessagePage(
  value: unknown,
): ResultPage<Message> | null {
  if (!isRecord(value) || !Array.isArray(value.items)) return null;
  const items = value.items
    .map(normalizeMessage)
    .filter((item): item is Message => item !== null);
  if (
    items.length !== value.items.length ||
    (value.nextCursor !== undefined && typeof value.nextCursor !== "string")
  ) {
    return null;
  }
  return { items, nextCursor: value.nextCursor };
}

export function normalizeMessageDelta(value: unknown): MessageDelta | null {
  if (
    !isRecord(value) ||
    !isConversationId(value.conversationId) ||
    !Array.isArray(value.messages) ||
    !isSequence(value.latestSequence) ||
    !isSequence(value.counterpartReadSequence)
  ) {
    return null;
  }
  const messages = value.messages
    .map(normalizeMessage)
    .filter((item): item is Message => item !== null);
  if (messages.length !== value.messages.length) return null;
  return {
    conversationId: value.conversationId,
    messages,
    latestSequence: value.latestSequence,
    counterpartReadSequence: value.counterpartReadSequence,
  };
}

function normalizeUnreadCounts(value: unknown): InboxUnreadCounts | null {
  if (
    !isRecord(value) ||
    !isSequence(value.primary) ||
    !isSequence(value.requests) ||
    !isSequence(value.opportunities)
  ) {
    return null;
  }
  return {
    primary: value.primary,
    requests: value.requests,
    opportunities: value.opportunities,
  };
}

export function normalizeInboxSnapshot(value: unknown): InboxSnapshot | null {
  if (!isRecord(value) || !Array.isArray(value.conversations)) return null;
  const unread = normalizeUnreadCounts(value.unread);
  if (!unread) return null;
  const conversations = value.conversations
    .map(normalizeConversationSummary)
    .filter((item): item is ConversationSummary => item !== null);
  if (conversations.length !== value.conversations.length) return null;
  return { conversations, unread };
}

export function totalUnread(counts: InboxUnreadCounts): number {
  return counts.primary + counts.requests + counts.opportunities;
}

export function normalizeNewMessage(value: unknown): NewMessage | null {
  if (
    !isRecord(value) ||
    !isMessageId(value.id) ||
    !isConversationId(value.conversationId) ||
    typeof value.body !== "string"
  ) {
    return null;
  }
  const body = value.body.trim();
  if (!body || body.length > MAX_MESSAGE_BODY_LENGTH) return null;
  return { id: value.id, conversationId: value.conversationId, body };
}

export function normalizeNewConversation(
  value: unknown,
): NewConversation | null {
  if (
    !isRecord(value) ||
    !isMessageId(value.messageId) ||
    typeof value.recipientHandle !== "string" ||
    typeof value.body !== "string"
  ) {
    return null;
  }
  const outreach = normalizeOutreachHeader(value.outreach);
  const body = value.body.trim();
  // The same canonicalization every other handle in the app goes through, so a
  // recipient cannot be addressed two ways, and a path character cannot ride in.
  const recipientHandle = normalizeProfileHandle(value.recipientHandle);
  if (!outreach || !body || !recipientHandle) return null;
  if (body.length > MAX_MESSAGE_BODY_LENGTH) return null;
  return {
    messageId: value.messageId,
    recipientHandle,
    outreach,
    body,
  };
}
