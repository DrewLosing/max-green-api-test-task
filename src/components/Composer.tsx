import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendIcon } from './icons'
import styles from './Composer.module.css'

/** SendMessage limit. */
const MAX_MESSAGE_LENGTH = 4000

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  const message = text.trim()

  function submit() {
    if (!message) return
    onSend(message)
    setText('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a line break; ignore Enter that confirms IME input.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.inner}>
        <textarea
          name="message"
          className={styles.input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
          autoFocus
        />
        <button className={styles.send} type="submit" disabled={!message} aria-label="Отправить">
          <SendIcon />
        </button>
      </div>
    </form>
  )
}
