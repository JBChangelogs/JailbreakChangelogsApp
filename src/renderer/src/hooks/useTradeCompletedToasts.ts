import { useEffect, useRef } from 'react'
import { useRealtime } from '@renderer/contexts/RealtimeContext'
import { dupesApi } from '@renderer/lib/dupesApi'
import { userDisplay } from '@renderer/lib/dupeDisplay'
import { showToast } from '@renderer/lib/toast'

export interface TradeCompletedEvent {
  user_id: string
  discord_id: string
  counterparty_user_id: string
  trade_id: string
  trade_time: number
}

export function isTradeCompletedEvent(data: unknown): data is TradeCompletedEvent {
  const event = data as Partial<TradeCompletedEvent> | null
  return (
    typeof event?.user_id === 'string' &&
    typeof event.counterparty_user_id === 'string' &&
    typeof event.trade_id === 'string' &&
    typeof event.trade_time === 'number'
  )
}

const notified = new Set<string>()

export function useTradeCompletedToasts(onOpenTradeHistory: () => void): void {
  const { subscribe } = useRealtime()
  const openRef = useRef(onOpenTradeHistory)
  openRef.current = onOpenTradeHistory

  useEffect(
    () =>
      subscribe((message) => {
        if (message.action !== 'trade_completed' || !isTradeCompletedEvent(message.data)) return
        const trade = message.data
        if (notified.has(trade.trade_id)) return
        notified.add(trade.trade_id)

        const notify = (name?: string): void => {
          showToast(name ? `Trade completed with ${name}` : 'Trade completed', {
            description: 'See what each side gave in Trade History.',
            analyticsType: 'trade',
            action: { label: 'View trade', onClick: () => openRef.current() }
          })
        }
        dupesApi
          .fetchUsersBatch([trade.counterparty_user_id])
          .then((users) => {
            const user = users[trade.counterparty_user_id]
            notify(user ? userDisplay(user, trade.counterparty_user_id) : undefined)
          })
          .catch(() => notify())
      }),
    [subscribe]
  )
}
