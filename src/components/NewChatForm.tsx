import { useState, type FormEvent } from 'react'
import { normalizePhone } from '../lib/phone'
import styles from './NewChatForm.module.css'

interface NewChatFormProps {
  onCreate: (phone: string) => void
  onCancel: () => void
}

export function NewChatForm({ onCreate, onCancel }: NewChatFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const phone = normalizePhone(value)
    if (!phone) {
      setError('Введите номер в международном формате, например +7 999 123-45-67')
      return
    }
    onCreate(phone)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} onKeyDown={(e) => e.key === 'Escape' && onCancel()}>
      <label className={styles.label} htmlFor="new-chat-phone">
        Номер телефона получателя
      </label>
      <div className={styles.row}>
        <input
          id="new-chat-phone"
          className={styles.input}
          type="tel"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder="+7 999 123-45-67"
          autoComplete="tel"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'new-chat-error' : undefined}
          autoFocus
        />
        <button className={styles.submit} type="submit" disabled={!value.trim()}>
          Создать
        </button>
      </div>
      {error && (
        <p id="new-chat-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
