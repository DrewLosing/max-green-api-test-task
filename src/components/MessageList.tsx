import { useLayoutEffect, useRef } from 'react'
import type { Message, MessageStatus } from '../chat/types'
import { formatTime } from '../lib/format'
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from './icons'
import styles from './MessageList.module.css'

/** How close to the bottom (px) still counts as "reading the latest messages". */
const STICK_THRESHOLD = 80

export function MessageList({ messages }: { messages: Message[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useLayoutEffect(() => {
    const element = scrollRef.current
    // Follow new messages unless the user scrolled up to read history; always follow our own sends.
    if (element && (stickToBottom.current || messages.at(-1)?.status === 'pending')) {
      element.scrollTop = element.scrollHeight
    }
  }, [messages])

  function handleScroll() {
    const element = scrollRef.current
    if (!element) return
    stickToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < STICK_THRESHOLD
  }

  return (
    <div className={styles.scroller} ref={scrollRef} onScroll={handleScroll}>
      {messages.length === 0 ? (
        <p className={styles.empty}>Сообщений пока нет. Напишите первое!</p>
      ) : (
        <ol className={styles.list} aria-live="polite">
          {messages.map((message) => (
            <li key={message.id} className={message.outgoing ? styles.outgoing : styles.incoming}>
              <div className={styles.bubble}>
                {message.author && <div className={styles.author}>{message.author}</div>}
                <span className={styles.text}>{message.text}</span>
                <span className={styles.meta}>
                  <time dateTime={new Date(message.timestamp).toISOString()}>
                    {formatTime(message.timestamp)}
                  </time>
                  {message.status && <StatusIcon status={message.status} />}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

const STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  const props = {
    width: 16,
    height: 16,
    className: styles.status,
    'data-status': status,
    role: 'img',
    'aria-hidden': false,
    'aria-label': STATUS_LABELS[status],
  }
  switch (status) {
    case 'pending':
      return <ClockIcon {...props} />
    case 'sent':
      return <CheckIcon {...props} />
    case 'delivered':
    case 'read':
      return <DoubleCheckIcon {...props} />
    case 'failed':
      return <AlertIcon {...props} />
  }
}
