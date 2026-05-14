import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StructuredJsonViewer } from './StructuredJsonViewer'

interface JsonViewerModalProps {
  data: Record<string, unknown>
  title?: string
  onClose: () => void
}

export function JsonViewerModal({ data, title, onClose }: JsonViewerModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="flex flex-col rounded-lg border bg-background shadow-lg"
        style={{ width: '80vw', height: '80vh' }}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {title ?? 'Step Output'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <StructuredJsonViewer data={data} />
        </div>
      </div>
    </div>
  )
}
