import { useEffect, useMemo, useReducer } from 'react'
import { createGreenApi } from '../api/greenApi'
import type { Credentials } from '../api/types'
import { chatReducer } from '../chat/chatReducer'
import type { Chat } from '../chat/types'
import { useNotificationPolling } from '../hooks/useNotificationPolling'
import { loadChatState, saveChatState } from '../lib/storage'
import { ChatWindow } from './ChatWindow'
import { MaxLogo } from './icons'
import styles from './Messenger.module.css'
import { Sidebar } from './Sidebar'

interface MessengerProps {
  credentials: Credentials
  onLogout: () => void
}

export function Messenger({ credentials, onLogout }: MessengerProps) {
  const { idInstance } = credentials
  const api = useMemo(() => createGreenApi(credentials), [credentials])
  const [state, dispatch] = useReducer(chatReducer, idInstance, loadChatState)

  useEffect(() => {
    saveChatState(idInstance, state)
  }, [idInstance, state])

  const connectionError = useNotificationPolling(api, (event) => dispatch({ type: 'eventReceived', event }))

  const activeChat = state.chats.find((chat) => chat.key === state.activeKey) ?? null

  async function sendMessage(chat: Chat, text: string) {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
    dispatch({
      type: 'messageQueued',
      key: chat.key,
      message: { id: localId, text, outgoing: true, timestamp: Date.now(), status: 'pending' },
    })
    try {
      const { idMessage } = await api.sendMessage(chat.chatId, text)
      dispatch({ type: 'messageSent', key: chat.key, localId, idMessage })
    } catch {
      dispatch({ type: 'messageFailed', key: chat.key, localId })
    }
  }

  return (
    <div className={styles.layout} data-view={activeChat ? 'chat' : 'list'}>
      <div className={styles.sidebar}>
        <Sidebar
          chats={state.chats}
          activeKey={state.activeKey}
          connectionError={connectionError}
          onSelect={(key) => dispatch({ type: 'chatSelected', key })}
          onCreate={(phone) => dispatch({ type: 'chatOpened', phone, now: Date.now() })}
          onLogout={onLogout}
        />
      </div>
      <main className={styles.main}>
        {activeChat ? (
          <ChatWindow
            key={activeChat.key}
            chat={activeChat}
            onSend={(text) => sendMessage(activeChat, text)}
            onBack={() => dispatch({ type: 'chatSelected', key: null })}
          />
        ) : (
          <div className={styles.placeholder}>
            <MaxLogo size={72} />
            <p>Выберите чат или создайте новый по номеру телефона</p>
          </div>
        )}
      </main>
    </div>
  )
}
