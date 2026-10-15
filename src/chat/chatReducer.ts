import { formatPhone } from '../lib/phone'
import type { Chat, ChatEvent, ChatState, Message, MessageStatus } from './types'

export type ChatAction =
  | { type: 'chatOpened'; phone: string; now: number }
  | { type: 'chatSelected'; key: string | null }
  | { type: 'messageQueued'; key: string; message: Message }
  | { type: 'messageSent'; key: string; localId: string; idMessage: string }
  | { type: 'messageFailed'; key: string; localId: string }
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

    case 'chatSelected':
      return selectChat(state, action.key)

    case 'messageQueued':
      return updateChat(state, action.key, (chat) => ({
        ...chat,
        messages: insertMessage(chat.messages, action.message),
      }))

    case 'messageSent':
      return updateChat(state, action.key, (chat) => {
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
      return updateChat(state, action.key, (chat) => ({
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
  const owner = findChatByMessageId(state.chats, event.messageId)
  if (!owner) return state
  return updateChat(state, owner.key, (chat) => ({
    ...withChatId(chat, event.chatId),
    messages: chat.messages.map((m) =>
      m.id === event.messageId ? { ...m, status: mergeStatus(m.status, event.status) } : m,
    ),
  }))
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
