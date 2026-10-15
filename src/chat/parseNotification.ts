import type { MessageData, MessageWebhook, StatusWebhook, WebhookBody } from '../api/types'
import type { ChatEvent, MessageStatus } from './types'

const STATUSES = new Map<string, MessageStatus>([
  ['sent', 'sent'],
  ['delivered', 'delivered'],
  ['read', 'read'],
  ['failed', 'failed'],
  ['noAccount', 'failed'],
  ['notInGroup', 'failed'],
])

/**
 * Maps a queue notification to a chat event, or null for anything the app doesn't show
 * (media, reactions, instance state…). Must never throw: a notification that fails here
 * would never be deleted and would block the queue.
 */
export function parseNotification(body: WebhookBody): ChatEvent | null {
  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
      return parseMessage(body as MessageWebhook, false)
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived':
      return parseMessage(body as MessageWebhook, true)
    case 'outgoingMessageStatus':
      return parseStatus(body as StatusWebhook)
    default:
      return null
  }
}

export function extractText(data: MessageData | undefined): string | null {
  switch (data?.typeMessage) {
    case 'textMessage':
      return data.textMessageData?.textMessage ?? null
    case 'extendedTextMessage':
    case 'quotedMessage':
      return data.extendedTextMessageData?.text ?? null
    default:
      return null
  }
}

function parseMessage(body: MessageWebhook, outgoing: boolean): ChatEvent | null {
  const text = extractText(body.messageData)
  const sender = body.senderData
  if (text === null || !sender?.chatId || !body.idMessage) return null

  const isGroup = sender.chatType === 'group'
  return {
    type: 'message',
    chatId: sender.chatId,
    chatName: sender.chatName || null,
    // In outgoing notifications it's unclear whose number senderPhoneNumber holds,
    // so the phone is only trusted for incoming direct messages.
    phone: !outgoing && !isGroup && sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : null,
    message: {
      id: body.idMessage,
      text,
      outgoing,
      timestamp: body.timestamp * 1000,
      status: outgoing ? 'sent' : undefined,
      author: !outgoing && isGroup ? sender.senderContactName || sender.senderName || undefined : undefined,
    },
  }
}

function parseStatus(body: StatusWebhook): ChatEvent | null {
  const status = STATUSES.get(body.status)
  if (!status || !body.idMessage) return null
  return {
    type: 'status',
    chatId: body.chatId,
    messageId: body.idMessage,
    status,
    timestamp: body.timestamp * 1000,
  }
}
