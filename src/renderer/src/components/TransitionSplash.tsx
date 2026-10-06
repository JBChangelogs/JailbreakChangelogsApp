import appIcon from '@renderer/assets/icon.png'

export function TransitionSplash({ visible }: { visible: boolean }): React.JSX.Element {
  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-primary-bg transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <img src={appIcon} alt="" className="h-16 w-16 rounded-full" draggable={false} />
      <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-border-primary border-t-status-info" />
    </div>
  )
}
