import { useState } from 'react'
import Markdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  maxHeight?: number
}

export function MarkdownRenderer({ content, maxHeight = 300 }: MarkdownRendererProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative">
      <div
        className="prose prose-sm dark:prose-invert max-w-none overflow-hidden"
        style={!expanded ? { maxHeight } : undefined}
      >
        <Markdown
          allowedElements={[
            'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre',
            'a', 'blockquote', 'hr', 'br',
          ]}
        >
          {content}
        </Markdown>
      </div>
      {content.length > 500 && (
        <button
          className="mt-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
