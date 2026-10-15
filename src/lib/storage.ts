import type { Credentials } from '../api/types'
import { initialChatState } from '../chat/chatReducer'
import type { ChatState } from '../chat/types'

const CREDENTIALS_KEY = 'max-chat:credentials'
const chatStateKey = (idInstance: string) => `max-chat:chats:${idInstance}`

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or disabled: the app keeps working, history just isn't persisted.
  }
}

export const loadCredentials = () => read<Credentials>(CREDENTIALS_KEY)
export const saveCredentials = (credentials: Credentials) => write(CREDENTIALS_KEY, credentials)
export const clearCredentials = () => localStorage.removeItem(CREDENTIALS_KEY)

/**
 * History lives only here: GREEN-API deletes notifications from the queue
 * once they are received, so they can't be fetched again after a reload.
 */
export function loadChatState(idInstance: string): ChatState {
  const saved = read<ChatState>(chatStateKey(idInstance))
  if (!saved || !Array.isArray(saved.chats)) return initialChatState
  return {
    activeKey: saved.activeKey ?? null,
    chats: saved.chats.map((chat) => ({
      ...chat,
      // A send interrupted by a reload never got its response; it can't stay pending forever.
      messages: chat.messages.map((m) => (m.status === 'pending' ? { ...m, status: 'failed' } : m)),
    })),
  }
}

export const saveChatState = (idInstance: string, state: ChatState) => write(chatStateKey(idInstance), state)
