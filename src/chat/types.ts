export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  /** idMessage from GREEN-API, or a local id while the send request is in flight. */
  id: string
  text: string
  outgoing: boolean
  /** Unix time, ms. */
  timestamp: number
  /** Outgoing messages only. */
  status?: MessageStatus
  /** Sender name for incoming group messages. */
  author?: string
}

export interface Chat {
  /** Stable local id; `chatId` can change once the real MAX chat id is learned. */
  key: string
  /** Where messages are sent: `79991234567@c.us` until a notification reveals the MAX id. */
  chatId: string
  phone: string | null
  name: string
  /** From the MAX profile; empty when the contact has none. */
  avatarUrl?: string
  /** CheckAccount found no MAX account for the phone. */
  unregistered?: boolean
  messages: Message[]
  unread: number
  createdAt: number
}

export interface ChatState {
  chats: Chat[]
  activeKey: string | null
}

/** A notification from the queue, reduced to what the chat UI needs. */
export type ChatEvent =
  | {
      type: 'message'
      chatId: string
      chatName: string | null
      phone: string | null
      message: Message
    }
  | {
      type: 'status'
      chatId: string
      messageId: string
      status: MessageStatus
      /** When the message was delivered or read, unix time, ms. */
      timestamp: number
    }
