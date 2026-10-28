export function SidebarHeader({ children }: { children?: React.ReactNode }): React.JSX.Element {
  return <div className="flex h-[57px] shrink-0 items-center border-b border-border-primary px-2 [&>*]:w-full">{children}</div>
}
