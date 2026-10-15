import { describe, expect, it } from 'vitest'
import type { WebhookBody } from '../api/types'
import { parseNotification } from './parseNotification'

const senderData = {
  chatId: '10000000',
  chatName: 'Иван Петров',
  chatType: 'user',
  sender: '10000000',
  senderName: 'Иван Петров',
  senderContactName: 'Иван Петров',
  senderPhoneNumber: 79876543210,
}

function messageWebhook(typeWebhook: string, messageData: object, overrides: object = {}): WebhookBody {
  return {
    typeWebhook,
    timestamp: 1763115112,
    idMessage: 'msg-1',
    senderData,
    messageData,
    ...overrides,
  } as WebhookBody
}

describe('parseNotification', () => {
  it('parses an incoming text message', () => {
    const event = parseNotification(
      messageWebhook('incomingMessageReceived', {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'Привет' },
      }),
    )
    expect(event).toEqual({
      type: 'message',
      chatId: '10000000',
      chatName: 'Иван Петров',
      phone: '79876543210',
      message: {
        id: 'msg-1',
        text: 'Привет',
        outgoing: false,
        timestamp: 1763115112000,
        status: undefined,
        author: undefined,
      },
    })
  })

  it('reads text from messages with links and quotes', () => {
    for (const typeMessage of ['extendedTextMessage', 'quotedMessage']) {
      const event = parseNotification(
        messageWebhook('incomingMessageReceived', {
          typeMessage,
          extendedTextMessageData: { text: 'см. https://green-api.com' },
        }),
      )
      expect(event?.type === 'message' && event.message.text).toBe('см. https://green-api.com')
    }
  })

  it('marks messages sent from the phone or API as outgoing without trusting the phone', () => {
    for (const typeWebhook of ['outgoingMessageReceived', 'outgoingAPIMessageReceived']) {
      const event = parseNotification(
        messageWebhook(typeWebhook, { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ок' } }),
      )
      expect(event).toMatchObject({ type: 'message', phone: null, message: { outgoing: true, status: 'sent' } })
    }
  })

  it('keeps the author for group messages', () => {
    const event = parseNotification(
      messageWebhook(
        'incomingMessageReceived',
        { typeMessage: 'textMessage', textMessageData: { textMessage: 'Всем привет' } },
        { senderData: { ...senderData, chatId: '-1000', chatType: 'group', senderPhoneNumber: 0 } },
      ),
    )
    expect(event).toMatchObject({ chatId: '-1000', phone: null, message: { author: 'Иван Петров' } })
  })

  it('maps delivery statuses, including failures', () => {
    const status = (value: string) =>
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        timestamp: 1,
        chatId: '10000000',
        idMessage: 'msg-1',
        status: value,
      } as WebhookBody)

    expect(status('read')).toEqual({
      type: 'status',
      chatId: '10000000',
      messageId: 'msg-1',
      status: 'read',
      timestamp: 1000,
    })
    expect(status('noAccount')).toMatchObject({ status: 'failed' })
    expect(status('somethingNew')).toBeNull()
  })

  it('ignores non-text messages and other notification types', () => {
    expect(parseNotification(messageWebhook('incomingMessageReceived', { typeMessage: 'imageMessage' }))).toBeNull()
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged', timestamp: 1 })).toBeNull()
  })

  it('does not throw on malformed payloads', () => {
    expect(parseNotification({ typeWebhook: 'incomingMessageReceived', timestamp: 1 })).toBeNull()
  })
})
