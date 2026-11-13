import { useCallback, useSyncExternalStore } from 'react'

const DRAFTS_KEY = 'jbcl:message-drafts'
const listeners = new Set<() => void>()
let drafts: Record<string, string> = readDrafts()

function readDrafts(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMessageDraft(chatId: string | null): [string, (value: string) => void] {
  const draft = useSyncExternalStore(subscribe, () => (chatId ? (drafts[chatId] ?? '') : ''))
  const setDraft = useCallback(
    (value: string) => {
      if (!chatId) return
      const { [chatId]: _, ...rest } = drafts
      drafts = value ? { ...rest, [chatId]: value } : rest
      try {
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts))
      } catch {
      }
      listeners.forEach((listener) => listener())
    },
    [chatId]
  )
  return [draft, setDraft]
}
