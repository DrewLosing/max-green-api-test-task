import { describe, expect, it } from 'vitest'
import { chatReducer, initialChatState, type ChatAction } from './chatReducer'
import type { ChatEvent, ChatState, Message } from './types'

const PHONE = '79991234567'

function reduce(...actions: ChatAction[]): ChatState {
  return actions.reduce(chatReducer, initialChatState)
}

const open: ChatAction = { type: 'chatOpened', phone: PHONE, now: 1_000 }

function incoming(id: string, overrides: Partial<Extract<ChatEvent, { type: 'message' }>> = {}): ChatAction {
  return {
    type: 'eventReceived',
    event: {
      type: 'message',
      chatId: '10000000',
      chatName: 'Иван',
      phone: PHONE,
      message: { id, text: `text ${id}`, outgoing: false, timestamp: 5_000 },
      ...overrides,
    },
  }
}

const pending: Message = { id: 'local-1', text: 'Привет', outgoing: true, timestamp: 2_000, status: 'pending' }

describe('chatReducer', () => {
  it('opens a chat addressed by phone and reuses it for the same number', () => {
    const state = reduce(open, { type: 'chatSelected', key: null }, open)
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]).toMatchObject({ chatId: `${PHONE}@c.us`, name: '+7 999 123-45-67' })
    expect(state.activeKey).toBe(state.chats[0].key)
  })

  it('replaces the local id with idMessage once the send succeeds', () => {
    const key = reduce(open).activeKey!
    const state = reduce(
      open,
      { type: 'messageQueued', key, message: pending },
      { type: 'messageSent', key, localId: 'local-1', idMessage: 'srv-1' },
    )
    expect(state.chats[0].messages).toEqual([{ ...pending, id: 'srv-1', status: 'sent' }])
  })

  it('marks a message failed when the send request fails', () => {
    const key = reduce(open).activeKey!
    const state = reduce(open, { type: 'messageQueued', key, message: pending }, { type: 'messageFailed', key, localId: 'local-1' })
    expect(state.chats[0].messages[0].status).toBe('failed')
  })

  it('routes a reply to the phone chat and switches it to the MAX chat id', () => {
    const state = reduce(open, incoming('in-1'))
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]).toMatchObject({ chatId: '10000000', name: 'Иван', unread: 0 })
    expect(state.chats[0].messages.map((m) => m.id)).toEqual(['in-1'])
  })

  it('learns the chat id from the webhook copy of our own message', () => {
    const key = reduce(open).activeKey!
    const state = reduce(
      open,
      { type: 'messageQueued', key, message: pending },
      { type: 'messageSent', key, localId: 'local-1', idMessage: 'srv-1' },
      incoming('srv-1', { phone: null, message: { ...pending, id: 'srv-1', status: 'sent' } }),
      // A reply from someone with a hidden number is still matched by chat id.
      incoming('in-1', { phone: null }),
    )
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0].chatId).toBe('10000000')
    expect(state.chats[0].messages.map((m) => m.id)).toEqual(['srv-1', 'in-1'])
  })

  it('drops the local copy if the webhook arrived before the send response', () => {
    const key = reduce(open).activeKey!
    const state = reduce(
      open,
      { type: 'messageQueued', key, message: pending },
      incoming('srv-1', { message: { ...pending, id: 'srv-1', status: 'sent' }, phone: PHONE }),
      { type: 'messageSent', key, localId: 'local-1', idMessage: 'srv-1' },
    )
    expect(state.chats[0].messages.map((m) => m.id)).toEqual(['srv-1'])
  })

  it('ignores redelivered notifications', () => {
    const state = reduce(open, { type: 'chatSelected', key: null }, incoming('in-1'), incoming('in-1'))
    expect(state.chats[0].messages).toHaveLength(1)
    expect(state.chats[0].unread).toBe(1)
  })

  it('creates a chat for messages from unknown senders and counts unread', () => {
    const state = reduce(incoming('in-1', { chatId: '20000000', chatName: 'Мария', phone: '79990000000' }))
    expect(state.chats[0]).toMatchObject({ key: 'chat:20000000', name: 'Мария', unread: 1 })
    expect(chatReducer(state, { type: 'chatSelected', key: 'chat:20000000' }).chats[0].unread).toBe(0)
  })

  it('keeps messages ordered by time', () => {
    const state = reduce(
      incoming('late', { message: { id: 'late', text: '', outgoing: false, timestamp: 9_000 } }),
      incoming('early', { message: { id: 'early', text: '', outgoing: false, timestamp: 3_000 } }),
    )
    expect(state.chats[0].messages.map((m) => m.id)).toEqual(['early', 'late'])
  })

  it('never moves a status backwards', () => {
    const key = reduce(open).activeKey!
    const status = (value: 'delivered' | 'read'): ChatAction => ({
      type: 'eventReceived',
      event: { type: 'status', chatId: '10000000', messageId: 'srv-1', status: value },
    })
    const state = reduce(
      open,
      { type: 'messageQueued', key, message: pending },
      { type: 'messageSent', key, localId: 'local-1', idMessage: 'srv-1' },
      status('read'),
      status('delivered'),
    )
    expect(state.chats[0].messages[0].status).toBe('read')
  })
})
