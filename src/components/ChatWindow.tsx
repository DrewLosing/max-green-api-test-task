import type { Chat } from '../chat/types'
import { formatPhone } from '../lib/phone'
import { Avatar } from './Avatar'
import styles from './ChatWindow.module.css'
import { Composer } from './Composer'
import { BackIcon } from './icons'
import { MessageList } from './MessageList'

interface ChatWindowProps {
  chat: Chat
  onSend: (text: string) => void
  onBack: () => void
}

export function ChatWindow({ chat, onSend, onBack }: ChatWindowProps) {
  const phone = chat.phone ? formatPhone(chat.phone) : null
  return (
    <section className={styles.window} aria-label={`Чат: ${chat.name}`}>
      <header className={styles.header}>
        <button className={styles.back} type="button" onClick={onBack} aria-label="К списку чатов">
          <BackIcon />
        </button>
        <Avatar name={chat.name} seed={chat.key} size={40} src={chat.avatarUrl} />
        <div className={styles.titles}>
          <h2 className={styles.name}>{chat.name}</h2>
          {phone && phone !== chat.name && <p className={styles.subtitle}>{phone}</p>}
        </div>
      </header>
      {chat.unregistered && (
        <p className={styles.notice} role="status">
          Номер не зарегистрирован в MAX — сообщения не будут доставлены
        </p>
      )}
      <MessageList messages={chat.messages} />
      <Composer onSend={onSend} />
    </section>
  )
}
