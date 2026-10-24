import { useRef } from 'react'

type AnyFunction = (...args: never[]) => unknown

export function useStableValue<T extends object>(next: T): T {
  const latest = useRef(next)
  latest.current = next
  const wrappers = useRef(new Map<string, AnyFunction>())
  const previous = useRef<T | null>(null)

  const stable = {} as Record<string, unknown>
  for (const [key, value] of Object.entries(next)) {
    if (typeof value !== 'function') {
      stable[key] = value
      continue
    }
    let wrapper = wrappers.current.get(key)
    if (!wrapper) {
      wrapper = (...args: never[]) => (latest.current as Record<string, AnyFunction>)[key](...args)
      wrappers.current.set(key, wrapper)
    }
    stable[key] = wrapper
  }

  const prev = previous.current as Record<string, unknown> | null
  const keys = Object.keys(stable)
  if (prev && keys.length === Object.keys(prev).length && keys.every((key) => prev[key] === stable[key])) {
    return previous.current as T
  }
  previous.current = stable as T
  return previous.current
}
