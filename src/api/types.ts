/** Instance access parameters from the GREEN-API console. */
export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export interface SendMessageResponse {
  idMessage: string
}

/** Only the fields this app reads; the API sends more. */
export interface WebhookBody {
  typeWebhook: string
  timestamp: number
}

export interface SenderData {
  chatId: string
  chatName?: string
  chatType?: 'user' | 'group' | 'channel' | 'bot'
  sender?: string
  senderName?: string
  senderContactName?: string
  /** 0 when the number is hidden or the sender is a group. */
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

/** incomingMessageReceived / outgoingMessageReceived / outgoingAPIMessageReceived */
export interface MessageWebhook extends WebhookBody {
  idMessage: string
  senderData: SenderData
  messageData: MessageData
}

/** outgoingMessageStatus */
export interface StatusWebhook extends WebhookBody {
  chatId: string
  idMessage: string
  status: string
  description?: string
}

export interface ReceivedNotification {
  receiptId: number
  body: WebhookBody
}
