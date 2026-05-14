import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { MarkdownEditorModal } from './MarkdownEditorModal'

interface MarkdownEditButtonProps {
  filePath: string
  requiredRole?: string
}

export function MarkdownEditButton({
  filePath,
  requiredRole,
}: MarkdownEditButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useAuth()

  if (!user) return null

  if (requiredRole) {
    const role = requiredRole.toLowerCase()
    const hasRole =
      user.roles.includes(role) || user.roles.includes('admin')
    if (!hasRole) return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {isOpen && (
        <MarkdownEditorModal
          filePath={filePath}
          requiredRole={requiredRole}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
