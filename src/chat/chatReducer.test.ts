import { describe, expect, it } from 'vitest'
import { chatReducer, initialChatState, type ChatAction } from './chatReducer'
import type { ChatEvent, ChatState, Message, MessageStatus } from './types'

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

function status(messageId: string, value: MessageStatus, timestamp = 100_000): ChatAction {
  return { type: 'eventReceived', event: { type: 'status', chatId: '10000000', messageId, status: value, timestamp } }
}

/** A chat with MAX id 10000000 and our messages srv-1..srv-n sent at 10 s, 20 s, … */
function chatWithSent(count: number): ChatState {
  const actions: ChatAction[] = [open, { type: 'chatResolved', phone: PHONE, chatId: '10000000' }]
  for (let i = 1; i <= count; i++) {
    const localId = `local-${i}`
    const message: Message = { id: localId, text: `msg ${i}`, outgoing: true, timestamp: i * 10_000, status: 'pending' }
    actions.push(
      { type: 'messageQueued', key: `phone:${PHONE}`, message },
      { type: 'messageSent', localId, idMessage: `srv-${i}` },
    )
  }
  return reduce(...actions)
}

const statuses = (state: ChatState) => state.chats[0].messages.map((m) => m.status)

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
      { type: 'messageSent', localId: 'local-1', idMessage: 'srv-1' },
    )
    expect(state.chats[0].messages).toEqual([{ ...pending, id: 'srv-1', status: 'sent' }])
  })

  it('marks a message failed when the send request fails', () => {
    const key = reduce(open).activeKey!
    const state = reduce(open, { type: 'messageQueued', key, message: pending }, { type: 'messageFailed', localId: 'local-1' })
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
      { type: 'messageSent', localId: 'local-1', idMessage: 'srv-1' },
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
      { type: 'messageSent', localId: 'local-1', idMessage: 'srv-1' },
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
    const state = chatReducer(chatWithSent(1), status('srv-1', 'read'))
    expect(statuses(chatReducer(state, status('srv-1', 'delivered')))).toEqual(['read'])
  })

  it('applies delivery and reading to everything sent before the message', () => {
    const reply = incoming('in-1', { message: { id: 'in-1', text: '', outgoing: false, timestamp: 15_000 } })
    const state = [reply, status('srv-2', 'read')].reduce(chatReducer, chatWithSent(3))
    expect(state.chats[0].messages.map((m) => [m.id, m.status])).toEqual([
      ['srv-1', 'read'],
      ['in-1', undefined],
      ['srv-2', 'read'],
      ['srv-3', 'sent'],
    ])
  })

  it('matches a status with an unknown id by chat and time', () => {
    // GREEN-API may report statuses under a MAX message id that differs from SendMessage's.
    const state = chatReducer(chatWithSent(3), status('115054445839974415', 'read', 24_000))
    expect(statuses(state)).toEqual(['read', 'read', 'sent'])
  })

  it('applies a status that outruns the send response', () => {
    const state = reduce(
      open,
      { type: 'chatResolved', phone: PHONE, chatId: '10000000' },
      { type: 'messageQueued', key: `phone:${PHONE}`, message: pending },
      status('srv-1', 'delivered', 2_100),
      { type: 'messageSent', localId: 'local-1', idMessage: 'srv-1' },
    )
    expect(statuses(state)).toEqual(['delivered'])
  })

  it('marks only the failed message, and only when its id is known', () => {
    const state = chatWithSent(2)
    expect(statuses(chatReducer(state, status('srv-1', 'failed')))).toEqual(['failed', 'sent'])
    expect(chatReducer(state, status('unknown', 'failed'))).toBe(state)
  })

  it('ignores statuses for chats it does not know', () => {
    const state = chatWithSent(1)
    const other: ChatAction = {
      type: 'eventReceived',
      event: { type: 'status', chatId: '30000000', messageId: 'x', status: 'read', timestamp: 10_000 },
    }
    expect(chatReducer(state, other)).toBe(state)
  })

  it('switches a phone chat to the MAX id found by CheckAccount', () => {
    const state = reduce(open, { type: 'chatResolved', phone: PHONE, chatId: '10000000' })
    expect(state.chats[0]).toMatchObject({ key: `phone:${PHONE}`, chatId: '10000000' })
  })

  it('flags numbers without a MAX account', () => {
    const state = reduce(open, { type: 'chatResolved', phone: PHONE, chatId: null })
    expect(state.chats[0]).toMatchObject({ chatId: `${PHONE}@c.us`, unregistered: true })
  })

  it('merges a phone chat into the chat a contact with a hidden number already has', () => {
    const state = reduce(
      incoming('in-1', { phone: null }),
      open,
      { type: 'messageQueued', key: `phone:${PHONE}`, message: { ...pending, timestamp: 9_000 } },
      { type: 'chatResolved', phone: PHONE, chatId: '10000000' },
      // The send response finds the message in the merged chat.
      { type: 'messageSent', localId: 'local-1', idMessage: 'srv-1' },
    )
    expect(state.chats).toHaveLength(1)
    expect(state.chats[0]).toMatchObject({ key: 'chat:10000000', phone: PHONE, unread: 0 })
    expect(state.chats[0].messages.map((m) => [m.id, m.status])).toEqual([
      ['in-1', undefined],
      ['srv-1', 'sent'],
    ])
    expect(state.activeKey).toBe('chat:10000000')
  })

  it('takes the name and avatar from the MAX profile', () => {
    const state = reduce(
      open,
      { type: 'chatResolved', phone: PHONE, chatId: '10000000' },
      { type: 'contactLoaded', chatId: '10000000', name: 'Иван Петров', avatarUrl: 'https://i.oneme.ru/i?r=1' },
    )
    expect(state.chats[0]).toMatchObject({ name: 'Иван Петров', avatarUrl: 'https://i.oneme.ru/i?r=1' })

    const unnamed = chatReducer(state, { type: 'contactLoaded', chatId: '10000000', name: '', avatarUrl: '' })
    expect(unnamed.chats[0]).toMatchObject({ name: 'Иван Петров', avatarUrl: '' })
  })
})
