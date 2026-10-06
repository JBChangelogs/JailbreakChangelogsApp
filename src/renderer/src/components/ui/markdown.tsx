import ReactMarkdown from 'react-markdown'

export function Markdown({ children, className = '' }: { children: string; className?: string }): React.JSX.Element {
  return (
    <div className={`changelog-prose text-sm ${className}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children: linkChildren }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault()
                if (href) void window.api.openExternal(href)
              }}
            >
              {linkChildren}
            </a>
          )
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
