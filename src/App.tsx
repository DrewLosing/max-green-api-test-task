import { useState } from 'react'
import type { Credentials } from './api/types'
import { LoginScreen } from './components/LoginScreen'
import { Messenger } from './components/Messenger'
import { clearCredentials, loadCredentials, saveCredentials } from './lib/storage'

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)

  function handleLogin(next: Credentials) {
    saveCredentials(next)
    setCredentials(next)
  }

  function handleLogout() {
    clearCredentials()
    setCredentials(null)
  }

  if (!credentials) return <LoginScreen onLogin={handleLogin} />
  return <Messenger key={credentials.idInstance} credentials={credentials} onLogout={handleLogout} />
}
