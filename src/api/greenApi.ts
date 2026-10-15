import type {
  Credentials,
  InstanceState,
  ReceivedNotification,
  SendMessageResponse,
} from './types'

export const DEFAULT_API_URL = 'https://api.green-api.com'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, details: string) {
    super(details || `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
  }
}

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return 'Неверный idInstance или apiTokenInstance'
    if (error.status === 429) return 'Слишком много запросов к GREEN-API'
    return `Ошибка GREEN-API (${error.status}): ${error.message}`
  }
  return 'Нет соединения с GREEN-API'
}

function extractErrorMessage(body: string): string {
  try {
    const data: unknown = JSON.parse(body)
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message
    }
  } catch {
    // Not JSON: fall through to the raw body.
  }
  return body.slice(0, 300)
}

export function normalizeApiUrl(apiUrl: string): string {
  const trimmed = apiUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return DEFAULT_API_URL
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export type GreenApi = ReturnType<typeof createGreenApi>

export function createGreenApi({ apiUrl, idInstance, apiTokenInstance }: Credentials) {
  const base = `${normalizeApiUrl(apiUrl)}/waInstance${idInstance}`

  async function request<T>(method: string, path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${base}/${method}/${apiTokenInstance}${path}`, init)
    const text = await response.text()
    if (!response.ok) throw new ApiError(response.status, extractErrorMessage(text))
    // Empty queue in receiveNotification comes back as an empty body or `null`.
    return (text ? JSON.parse(text) : null) as T
  }

  return {
    getStateInstance(signal?: AbortSignal) {
      return request<{ stateInstance: InstanceState }>('getStateInstance', '', { signal })
    },

    sendMessage(chatId: string, message: string) {
      return request<SendMessageResponse>('sendMessage', '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
      })
    },

    /** Long-polls the queue for up to `timeoutSec` (5–60) seconds. */
    receiveNotification(timeoutSec: number, signal?: AbortSignal) {
      return request<ReceivedNotification | null>(
        'receiveNotification',
        `?receiveTimeout=${timeoutSec}`,
        { signal },
      )
    },

    deleteNotification(receiptId: number, signal?: AbortSignal) {
      return request<{ result: boolean }>('deleteNotification', `/${receiptId}`, {
        method: 'DELETE',
        signal,
      })
    },
  }
}
