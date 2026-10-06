import { useEffect, useState } from 'react'
import type { Item } from '@shared/item'

const PARTIAL_FIELDS = [
  'id',
  'name',
  'type',
  'creator',
  'trend',
  'is_seasonal',
  'cash_value',
  'duped_value',
  'price',
  'is_limited',
  'notes',
  'demand',
  'duped_demand',
  'description',
  'health',
  'tradable'
].join(',')
const ITEMS_PARTIAL_URL = `https://api.jailbreakchangelogs.com/v2/items/partial?fields=${PARTIAL_FIELDS}`

let cache: Item[] | null = null
let inFlight: Promise<Item[] | null> | null = null
const listeners = new Set<(items: Item[]) => void>()

function loadItems(): Promise<Item[] | null> {
  return fetch(ITEMS_PARTIAL_URL)
    .then((res) => (res.ok ? (res.json() as Promise<Item[]>) : null))
    .then((data) => {
      cache = data
      inFlight = null
      if (data) for (const listener of listeners) listener(data)
      return data
    })
    .catch((err: unknown) => {
      console.error('[items] failed to load', err)
      inFlight = null
      return null
    })
}

function fetchItems(): Promise<Item[] | null> {
  if (cache) return Promise.resolve(cache)
  if (!inFlight) inFlight = loadItems()
  return inFlight
}

export function refreshItems(): Promise<Item[] | null> {
  inFlight = loadItems()
  return inFlight
}

export function useItems(): { items: Item[]; loading: boolean; error: boolean } {
  const [items, setItems] = useState<Item[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState(false)

  useEffect(() => {
    const listener = (next: Item[]): void => setItems(next)
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  useEffect(() => {
    if (cache) return
    fetchItems().then((data) => {
      setItems(data ?? [])
      setError(!data)
      setLoading(false)
    })
  }, [])

  return { items, loading, error }
}
