import { invoke } from '@tauri-apps/api/core'

type Rect = { x: number; y: number; width: number; height: number }

const box = document.getElementById('box') as HTMLElement
const shade = document.getElementById('shade') as HTMLElement
let start: { x: number; y: number } | null = null
let done = false

function finish(rect: Rect | null): void {
  if (done) return
  done = true
  void invoke('scanner_pick_done', { rect })
}

function rectTo(e: MouseEvent): Rect {
  const from = start as { x: number; y: number }
  return {
    x: Math.min(from.x, e.clientX),
    y: Math.min(from.y, e.clientY),
    width: Math.abs(e.clientX - from.x),
    height: Math.abs(e.clientY - from.y)
  }
}

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') finish(null)
})
addEventListener('contextmenu', (e) => e.preventDefault())
addEventListener('mousedown', (e) => {
  start = { x: e.clientX, y: e.clientY }
})
addEventListener('mousemove', (e) => {
  if (!start) return
  const r = rectTo(e)
  shade.style.display = 'none'
  box.style.display = 'block'
  box.style.left = `${r.x}px`
  box.style.top = `${r.y}px`
  box.style.width = `${r.width}px`
  box.style.height = `${r.height}px`
})
addEventListener('mouseup', (e) => {
  if (!start) return
  const r = rectTo(e)
  finish(r.width < 20 || r.height < 20 ? null : r)
})
