import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function prettyShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map((part) => part.replace(/^Key(\w)$/, '$1').replace(/^Digit(\d)$/, '$1'))
    .join(' + ')
}
