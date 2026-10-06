export function normalizeToMs(timestamp: number): number {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

export function formatConversationTimestamp(timestamp: number): string {
  const date = new Date(normalizeToMs(timestamp))
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatTimeOnly(timestamp: number): string {
  const date = new Date(normalizeToMs(timestamp))
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

const DAY_MS = 24 * 60 * 60 * 1000

export function formatMessageTimestamp(timestamp: number): string {
  const date = new Date(normalizeToMs(timestamp))
  if (Date.now() - date.getTime() < DAY_MS) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export function describeMetadata(metadata: Record<string, unknown>): string {
  if (metadata.type === 'offer_accepted') {
    const trade = metadata.trade
    return trade ? `Trade offer #${trade} was accepted` : 'A trade offer was accepted'
  }
  return 'System message'
}
