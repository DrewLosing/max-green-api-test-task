import { useEffect, useEffectEvent, useRef } from 'react'
import type { GreenApi } from '../api/greenApi'
import type { ContactInfo } from '../api/types'

/** MAX user ids are positive numbers; groups are negative, and `phone@c.us` isn't accepted. */
const isUserId = (chatId: string) => /^\d+$/.test(chatId)

/**
 * Loads names and avatars of individual chats from their MAX profiles, one request at a time.
 * Each chat is requested once per session: avatar links may expire, so a reload refreshes them.
 */
export function useContactInfo(
  api: GreenApi,
  chatIds: string[],
  onLoaded: (chatId: string, contact: ContactInfo) => void,
) {
  const loaded = useRef(new Set<string>())
  const handleLoaded = useEffectEvent(onLoaded)
  // A string, so the effect reruns only when the set of chats changes.
  const userIds = chatIds.filter(isUserId).join(',')

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      for (const chatId of userIds.split(',')) {
        if (!chatId || loaded.current.has(chatId)) continue
        try {
          handleLoaded(chatId, await api.getContactInfo(chatId, controller.signal))
        } catch {
          // An interrupted request is repeated by the next run; otherwise the chat keeps its initials.
          if (controller.signal.aborted) return
        }
        loaded.current.add(chatId)
      }
    }

    void load()
    return () => controller.abort()
  }, [api, userIds])
}
