import { useMemo, useState } from 'react'
import type { Chat } from '../chat/types'
import { formatListTime } from '../lib/format'
import { Avatar } from './Avatar'
import { LogoutIcon, NewChatIcon } from './icons'
import { NewChatForm } from './NewChatForm'
import styles from './Sidebar.module.css'

interface SidebarProps {
  chats: Chat[]
  activeKey: string | null
  connectionError: string | null
  onSelect: (key: string) => void
  onCreate: (phone: string) => void
  onLogout: () => void
}

const lastActivity = (chat: Chat) => chat.messages.at(-1)?.timestamp ?? chat.createdAt

export function Sidebar({ chats, activeKey, connectionError, onSelect, onCreate, onLogout }: SidebarProps) {
  const [isCreating, setIsCreating] = useState(chats.length === 0)
  const sortedChats = useMemo(() => chats.toSorted((a, b) => lastActivity(b) - lastActivity(a)), [chats])

  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <h1 className={styles.title}>Чаты</h1>
        <button
          className={styles.iconButton}
          type="button"
          onClick={() => setIsCreating((value) => !value)}
          aria-label="Новый чат"
          aria-expanded={isCreating}
          title="Новый чат"
        >
          <NewChatIcon />
        </button>
        <button className={styles.iconButton} type="button" onClick={onLogout} aria-label="Выйти" title="Выйти">
          <LogoutIcon />
        </button>
      </header>

      {connectionError && (
        <p className={styles.connectionError} role="status">
          {connectionError}. Переподключаемся…
        </p>
      )}

      {isCreating && (
        <NewChatForm
          onCreate={(phone) => {
            onCreate(phone)
            setIsCreating(false)
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {sortedChats.length > 0 ? (
        <ul className={styles.list}>
          {sortedChats.map((chat) => (
            <li key={chat.key}>
              <ChatListItem chat={chat} active={chat.key === activeKey} onSelect={() => onSelect(chat.key)} />
            </li>
          ))}
        </ul>
      ) : (
        !isCreating && <p className={styles.empty}>Чатов пока нет</p>
      )}
    </aside>
  )
}

interface ChatListItemProps {
  chat: Chat
  active: boolean
  onSelect: () => void
}

function ChatListItem({ chat, active, onSelect }: ChatListItemProps) {
  const last = chat.messages.at(-1)
  return (
    <button
      className={styles.item}
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
    >
      <Avatar name={chat.name} seed={chat.key} size={54} src={chat.avatarUrl} />
      <span className={styles.itemBody}>
        <span className={styles.itemRow}>
          <span className={styles.itemName}>{chat.name}</span>
          <span className={styles.itemTime}>{formatListTime(lastActivity(chat))}</span>
        </span>
        <span className={styles.itemRow}>
          <span className={styles.itemPreview}>
            {last ? (
              <>
                {last.outgoing && <span className={styles.itemYou}>Вы: </span>}
                {last.text}
              </>
            ) : (
              'Нет сообщений'
            )}
          </span>
          {chat.unread > 0 && (
            <span className={styles.badge} aria-label={`Непрочитанных: ${chat.unread}`}>
              {chat.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
