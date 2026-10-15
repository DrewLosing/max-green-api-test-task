import { useEffect } from 'react'
import type { GreenApi } from '../api/greenApi'

/**
 * Marks the open chat as read whenever a new incoming message shows up in it, so the contact
 * sees read ticks. Waits until the page is visible: a background tab hasn't read anything.
 */
export function useMarkChatRead(api: GreenApi, chatId: string | undefined, lastIncomingId: string | undefined) {
  useEffect(() => {
    if (!chatId || !lastIncomingId) return

    const markRead = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', markRead)
      // A lost read receipt isn't worth bothering the user about.
      api.readChat(chatId).catch(() => {})
    }

    document.addEventListener('visibilitychange', markRead)
    markRead()
    return () => document.removeEventListener('visibilitychange', markRead)
  }, [api, chatId, lastIncomingId])
}
