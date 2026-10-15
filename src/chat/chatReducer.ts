import { formatPhone } from '../lib/phone'
import type { Chat, ChatEvent, ChatState, Message, MessageStatus } from './types'

export type ChatAction =
  | { type: 'chatOpened'; phone: string; now: number }
  /** CheckAccount result: the MAX user id of the phone, or null if it has no account. */
  | { type: 'chatResolved'; phone: string; chatId: string | null }
  | { type: 'contactLoaded'; chatId: string; name: string; avatarUrl: string }
  | { type: 'chatSelected'; key: string | null }
  | { type: 'messageQueued'; key: string; message: Message }
  | { type: 'messageSent'; localId: string; idMessage: string }
  | { type: 'messageFailed'; localId: string }
  | { type: 'eventReceived'; event: ChatEvent }

export const initialChatState: ChatState = { chats: [], activeKey: null }

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatOpened': {
      const existing = state.chats.find((chat) => chat.phone === action.phone)
      if (existing) return selectChat(state, existing.key)
      const chat: Chat = {
        key: `phone:${action.phone}`,
        chatId: `${action.phone}@c.us`,
        phone: action.phone,
        name: formatPhone(action.phone),
        messages: [],
        unread: 0,
        createdAt: action.now,
      }
      return { chats: [...state.chats, chat], activeKey: chat.key }
    }

    case 'chatResolved': {
      const { chatId } = action
      const chat = state.chats.find((c) => c.phone === action.phone)
      if (!chat) return state
      if (!chatId) return updateChat(state, chat.key, (c) => ({ ...c, unregistered: true }))
      const twin = state.chats.find((c) => c.key !== chat.key && c.chatId === chatId)
      return twin ? mergeChat(state, chat, twin) : updateChat(state, chat.key, (c) => withChatId(c, chatId))
    }

    case 'contactLoaded':
      return {
        ...state,
        chats: state.chats.map((chat) =>
          chat.chatId === action.chatId
            ? { ...chat, name: action.name || chat.name, avatarUrl: action.avatarUrl }
            : chat,
        ),
      }

    case 'chatSelected':
      return selectChat(state, action.key)

    case 'messageQueued':
      return updateChat(state, action.key, (chat) => ({
        ...chat,
        messages: insertMessage(chat.messages, action.message),
      }))

    // The chat is found by the local id: it may have been merged while the request was in flight.
    case 'messageSent':
      return updateChatOf(state, action.localId, (chat) => {
        // The queue may deliver our own message back before sendMessage has responded.
        const alreadyReceived = chat.messages.some((m) => m.id === action.idMessage)
        const messages = alreadyReceived
          ? chat.messages.filter((m) => m.id !== action.localId)
          : chat.messages.map((m) =>
              m.id === action.localId ? { ...m, id: action.idMessage, status: mergeStatus(m.status, 'sent') } : m,
            )
        return { ...chat, messages }
      })

    case 'messageFailed':
      return updateChatOf(state, action.localId, (chat) => ({
        ...chat,
        messages: chat.messages.map((m) => (m.id === action.localId ? { ...m, status: 'failed' } : m)),
      }))

    case 'eventReceived':
      return action.event.type === 'message'
        ? applyMessage(state, action.event)
        : applyStatus(state, action.event)
  }
}

type MessageEvent = Extract<ChatEvent, { type: 'message' }>
type StatusEvent = Extract<ChatEvent, { type: 'status' }>

function applyMessage(state: ChatState, event: MessageEvent): ChatState {
  const { message } = event

  const owner = findChatByMessageId(state.chats, message.id)
  if (owner) {
    // Already shown (sent from this app, or redelivered after a failed delete).
    return updateChat(state, owner.key, (chat) => withChatId(chat, event.chatId))
  }

  const existing =
    state.chats.find((chat) => chat.chatId === event.chatId) ??
    (event.phone ? state.chats.find((chat) => chat.phone === event.phone) : undefined)

  const chat: Chat = existing ?? {
    key: `chat:${event.chatId}`,
    chatId: event.chatId,
    phone: event.phone,
    name: event.phone ? formatPhone(event.phone) : event.chatId,
    messages: [],
    unread: 0,
    createdAt: message.timestamp,
  }

  const updated: Chat = {
    ...withChatId(chat, event.chatId),
    phone: chat.phone ?? event.phone,
    name: event.chatName ?? chat.name,
    messages: insertMessage(chat.messages, message),
    unread: !message.outgoing && chat.key !== state.activeKey ? chat.unread + 1 : chat.unread,
  }

  return {
    ...state,
    chats: existing
      ? state.chats.map((c) => (c.key === existing.key ? updated : c))
      : [...state.chats, updated],
  }
}

function applyStatus(state: ChatState, event: StatusEvent): ChatState {
  const owner =
    findChatByMessageId(state.chats, event.messageId) ?? state.chats.find((chat) => chat.chatId === event.chatId)
  if (!owner) return state
  const chat = withChatId(owner, event.chatId)
  const messages = markStatus(owner.messages, event)
  if (chat === owner && messages === owner.messages) return state
  return updateChat(state, owner.key, () => ({ ...chat, messages }))
}

/** Leeway for the difference between the browser clock and GREEN-API's when matching by time. */
const CLOCK_SKEW_MS = 5_000

/**
 * MAX tracks delivery and reading per chat: when a message is read, so is everything before it,
 * and a status may come for the latest message only. The status idMessage can also differ from
 * the one SendMessage returned; then the status covers what was sent before the event.
 */
function markStatus(messages: Message[], event: StatusEvent): Message[] {
  const target = messages.findLastIndex((m) => m.id === event.messageId)

  if (event.status === 'failed') {
    // A failure concerns a single message, and there is no telling which one without the id.
    return target === -1 ? messages : messages.with(target, { ...messages[target], status: 'failed' })
  }

  const last =
    target !== -1
      ? target
      : messages.findLastIndex((m) => m.outgoing && m.timestamp <= event.timestamp + CLOCK_SKEW_MS)
  if (last === -1) return messages

  return messages.map((m, index) => {
    if (index > last || !m.outgoing) return m
    const status = mergeStatus(m.status, event.status)
    return status === m.status ? m : { ...m, status }
  })
}

/** A contact with a hidden number may already have a chat under their MAX id: keep just that one. */
function mergeChat(state: ChatState, from: Chat, into: Chat): ChatState {
  const activeKey = state.activeKey === from.key ? into.key : state.activeKey
  const merged: Chat = {
    ...into,
    phone: into.phone ?? from.phone,
    messages: from.messages.reduce(insertMessage, into.messages),
    unread: activeKey === into.key ? 0 : into.unread + from.unread,
  }
  return {
    activeKey,
    chats: state.chats.filter((chat) => chat.key !== from.key).map((chat) => (chat.key === into.key ? merged : chat)),
  }
}

function selectChat(state: ChatState, key: string | null): ChatState {
  return {
    activeKey: key,
    chats: state.chats.map((chat) => (chat.key === key && chat.unread ? { ...chat, unread: 0 } : chat)),
  }
}

function updateChat(state: ChatState, key: string, update: (chat: Chat) => Chat): ChatState {
  return { ...state, chats: state.chats.map((chat) => (chat.key === key ? update(chat) : chat)) }
}

function updateChatOf(state: ChatState, messageId: string, update: (chat: Chat) => Chat): ChatState {
  const chat = findChatByMessageId(state.chats, messageId)
  return chat ? updateChat(state, chat.key, update) : state
}

function findChatByMessageId(chats: Chat[], id: string): Chat | undefined {
  return chats.find((chat) => chat.messages.some((m) => m.id === id))
}

/** Switches a phone-addressed chat to the MAX chat id once a notification reveals it. */
function withChatId(chat: Chat, chatId: string): Chat {
  return chatId && chat.chatId !== chatId ? { ...chat, chatId } : chat
}

/** Keeps messages ordered by time; new messages almost always go to the end. */
function insertMessage(messages: Message[], message: Message): Message[] {
  let index = messages.length
  while (index > 0 && messages[index - 1].timestamp > message.timestamp) index--
  return [...messages.slice(0, index), message, ...messages.slice(index)]
}

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

/** Statuses can arrive out of order; never move a message backwards. */
function mergeStatus(current: MessageStatus | undefined, next: MessageStatus): MessageStatus {
  return current && STATUS_RANK[current] > STATUS_RANK[next] ? current : next
}
