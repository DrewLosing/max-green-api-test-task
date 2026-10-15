const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' })

export const formatTime = (timestamp: number) => timeFormat.format(timestamp)

/** Time for today's messages, date for older ones — like the chat list in MAX. */
export function formatListTime(timestamp: number, now = Date.now()): string {
  return new Date(timestamp).toDateString() === new Date(now).toDateString()
    ? formatTime(timestamp)
    : dateFormat.format(timestamp)
}
