import { useState, type FormEvent } from 'react'
import { createGreenApi, DEFAULT_API_URL, describeApiError, normalizeApiUrl } from '../api/greenApi'
import type { Credentials, InstanceState } from '../api/types'
import { MaxLogo } from './icons'
import styles from './LoginScreen.module.css'

const STATE_ERRORS: Record<Exclude<InstanceState, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован: отсканируйте QR-код в личном кабинете GREEN-API.',
  blocked: 'Аккаунт MAX на этом инстансе заблокирован.',
  starting: 'Инстанс запускается. Попробуйте через пару минут.',
  suspended: 'На аккаунте MAX временные ограничения на отправку сообщений.',
  pendingPassword: 'Авторизация инстанса не завершена: требуется пароль 2FA.',
}

interface LoginScreenProps {
  onLogin: (credentials: Credentials) => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [form, setForm] = useState<Credentials>({
    apiUrl: DEFAULT_API_URL,
    idInstance: '',
    apiTokenInstance: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const update = (field: keyof Credentials) => (event: { target: { value: string } }) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const credentials: Credentials = {
      apiUrl: normalizeApiUrl(form.apiUrl),
      idInstance: form.idInstance.trim(),
      apiTokenInstance: form.apiTokenInstance.trim(),
    }

    setChecking(true)
    setError(null)
    try {
      const { stateInstance } = await createGreenApi(credentials).getStateInstance()
      if (stateInstance === 'authorized') {
        onLogin(credentials)
        return
      }
      setError(STATE_ERRORS[stateInstance] ?? `Инстанс в состоянии «${stateInstance}».`)
    } catch (err) {
      setError(describeApiError(err))
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <MaxLogo size={56} />
        <h1 className={styles.title}>Вход в MAX через GREEN-API</h1>
        <p className={styles.subtitle}>
          Введите параметры инстанса из{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личного кабинета GREEN-API
          </a>
        </p>

        <label className={styles.field}>
          <span className={styles.label}>idInstance</span>
          <input
            name="idInstance"
            className={styles.input}
            value={form.idInstance}
            onChange={update('idInstance')}
            inputMode="numeric"
            pattern="\d+"
            title="Только цифры"
            placeholder="3100000000"
            autoComplete="username"
            required
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiTokenInstance</span>
          <input
            name="apiTokenInstance"
            className={styles.input}
            type="password"
            value={form.apiTokenInstance}
            onChange={update('apiTokenInstance')}
            autoComplete="current-password"
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiUrl</span>
          <input
            name="apiUrl"
            className={styles.input}
            type="url"
            value={form.apiUrl}
            onChange={update('apiUrl')}
            placeholder={DEFAULT_API_URL}
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={checking}>
          {checking ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
