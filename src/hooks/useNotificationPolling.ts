import { useEffect, useEffectEvent, useState } from 'react'
import { describeApiError, type GreenApi } from '../api/greenApi'
import { parseNotification } from '../chat/parseNotification'
import type { ChatEvent } from '../chat/types'

/** Long-poll window for receiveNotification (API allows 5–60 s). */
const RECEIVE_TIMEOUT_SEC = 20
const MIN_RETRY_MS = 1_000
const MAX_RETRY_MS = 30_000

/**
 * Drains the instance's notification queue: receive → handle → delete, one at a time,
 * so events are applied in the order GREEN-API delivered them.
 *
 * Returns the last connection error, or null while polling works. There is no separate
 * "connecting" state: an idle long poll is indistinguishable from a slow one, while
 * auth and network failures surface immediately.
 */
export function useNotificationPolling(api: GreenApi, onEvent: (event: ChatEvent) => void): string | null {
  const [error, setError] = useState<string | null>(null)
  const handleEvent = useEffectEvent(onEvent)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function poll() {
      let retryDelay = MIN_RETRY_MS
      while (!signal.aborted) {
        try {
          const notification = await api.receiveNotification(RECEIVE_TIMEOUT_SEC, signal)
          setError(null)
          retryDelay = MIN_RETRY_MS
          if (!notification) continue

          const event = parseNotification(notification.body)
          if (event) handleEvent(event)
          // Deleting after handling gives at-least-once delivery; the reducer drops duplicates.
          await api.deleteNotification(notification.receiptId, signal)
        } catch (cause) {
          if (signal.aborted) return
          setError(describeApiError(cause))
          await sleep(retryDelay, signal)
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS)
        }
      }
    }

    void poll()
    return () => controller.abort()
  }, [api])

  return error
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}
