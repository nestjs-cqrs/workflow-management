import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Link } from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import {
  api,
  ApiError,
  type FileContentResponse,
  type FileSaveResponse,
  type FileVersionsResponse,
  type FileVersionContent,
} from '@/api/client'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Loader2,
  X,
  History,
  FileEdit,
  AlertTriangle,
} from 'lucide-react'

interface MarkdownEditorModalProps {
  filePath: string
  requiredRole?: string
  onClose: () => void
}

function formatTimeAgo(dateStr: string): string {
  const time = new Date(dateStr).getTime()
  if (isNaN(time)) return 'unknown'
  const diff = Date.now() - time
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

function EditorToolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addTable = () => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  }

  const btnClass = (active: boolean) =>
    `rounded p-1.5 hover:bg-accent ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-3 py-2">
      <button
        type="button"
        className={btnClass(editor.isActive('bold'))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('italic'))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        className={btnClass(editor.isActive('heading', { level: 1 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('heading', { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('heading', { level: 3 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        className={btnClass(editor.isActive('bulletList'))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('orderedList'))}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <div className="mx-1 h-5 w-px bg-border" />
      <button
        type="button"
        className={btnClass(editor.isActive('codeBlock'))}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('blockquote'))}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={btnClass(editor.isActive('link'))}
        onClick={addLink}
      >
        <LinkIcon className="h-4 w-4" />
      </button>
      <button type="button" className={btnClass(false)} onClick={addTable}>
        <TableIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

export function MarkdownEditorModal({
  filePath,
  requiredRole,
  onClose,
}: MarkdownEditorModalProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'editor' | 'history'>('editor')
  const [isDirty, setIsDirty] = useState(false)
  const [viewingVersion, setViewingVersion] = useState<{
    versionId: string
    date: string
  } | null>(null)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const etagRef = useRef('')
  const processedEtag = useRef('')
  const isResettingRef = useRef(false)

  const fileQuery = useQuery<FileContentResponse>({
    queryKey: ['files', filePath],
    queryFn: () => api.get(`/files?path=${encodeURIComponent(filePath)}`),
  })

  const versionsQuery = useQuery<FileVersionsResponse>({
    queryKey: ['files', filePath, 'versions'],
    queryFn: () =>
      api.get(`/files/versions?path=${encodeURIComponent(filePath)}`),
    enabled: activeTab === 'history',
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing...' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({ openOnClick: false }),
      Markdown,
    ],
    content: '',
    onUpdate: () => {
      if (isResettingRef.current) {
        setIsDirty(false)
      } else {
        setIsDirty(true)
        setStatusMessage(null)
      }
    },
  })

  useEffect(() => {
    if (!fileQuery.data || !editor) return
    if (fileQuery.data.etag === processedEtag.current) return

    processedEtag.current = fileQuery.data.etag
    etagRef.current = fileQuery.data.etag

    isResettingRef.current = true
    editor.commands.setContent(fileQuery.data.content)
    isResettingRef.current = false
  }, [fileQuery.data, editor])

  const saveMutation = useMutation<FileSaveResponse, ApiError, string>({
    mutationFn: (content: string) =>
      api.put(
        `/files?path=${encodeURIComponent(filePath)}${requiredRole ? `&requiredRole=${encodeURIComponent(requiredRole)}` : ''}`,
        { content },
        { headers: { 'If-Match': etagRef.current } },
      ),
    onSuccess: (data) => {
      const currentContent = editor?.storage.markdown.getMarkdown() ?? ''
      etagRef.current = data.etag
      processedEtag.current = data.etag

      queryClient.setQueryData<FileContentResponse>(['files', filePath], {
        content: currentContent,
        etag: data.etag,
        versionId: data.versionId,
        lastModified: data.lastModified,
      })

      setIsDirty(false)
      setViewingVersion(null)
      setStatusMessage({ type: 'success', text: 'File saved' })
      queryClient.invalidateQueries({
        queryKey: ['files', filePath, 'versions'],
      })
      queryClient.invalidateQueries({
        queryKey: ['approvals', 'step-output'],
      })
    },
    onError: (error) => {
      if (error.status === 409) {
        setShowConflictDialog(true)
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Save failed. Your changes are preserved in the editor. Try again.',
        })
      }
    },
  })

  const handleSave = () => {
    if (!editor) return
    const content = editor.storage.markdown.getMarkdown()
    saveMutation.mutate(content)
  }

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardDialog(true)
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  const handleReload = () => {
    setShowConflictDialog(false)
    setIsDirty(false)
    setViewingVersion(null)
    processedEtag.current = ''
    queryClient.invalidateQueries({ queryKey: ['files', filePath] })
  }

  const handleLoadVersion = (version: FileVersionContent) => {
    if (!editor) return
    editor.commands.setContent(version.content)
    setViewingVersion({
      versionId: version.versionId,
      date: new Date(version.lastModified).toLocaleString(),
    })
    setActiveTab('editor')
  }

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [handleClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="flex flex-col rounded-lg border bg-background shadow-xl"
        style={{ width: '80vw', height: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Edit File</h2>
            <span className="max-w-md truncate font-mono text-xs text-muted-foreground">
              {filePath}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-sm ${activeTab === 'editor' ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('editor')}
            >
              <FileEdit className="mr-1.5 inline h-3.5 w-3.5" />
              Editor
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 text-sm ${activeTab === 'history' ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('history')}
            >
              <History className="mr-1.5 inline h-3.5 w-3.5" />
              History
            </button>
            <div className="mx-1 h-5 w-px bg-border" />
            <button
              type="button"
              className="rounded p-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'editor' && (
            <div className="flex h-full flex-col">
              {fileQuery.isLoading && (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {fileQuery.error && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
                    <p className="text-sm text-destructive">
                      {fileQuery.error instanceof ApiError &&
                      fileQuery.error.isNotFound
                        ? 'File not found'
                        : 'Failed to load file'}
                    </p>
                  </div>
                </div>
              )}
              {fileQuery.data && editor && (
                <>
                  {viewingVersion && (
                    <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      Viewing version from {viewingVersion.date}. Click Save to
                      restore this version.
                    </div>
                  )}
                  <EditorToolbar editor={editor} />
                  <div className="flex-1 overflow-auto px-4 py-3">
                    <EditorContent
                      editor={editor}
                      className="prose prose-sm dark:prose-invert max-w-none focus:outline-none [&_.tiptap]:min-h-[200px] [&_.tiptap]:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="h-full overflow-auto p-4">
              {versionsQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {versionsQuery.error && (
                <p className="text-sm text-muted-foreground">
                  Failed to load version history
                </p>
              )}
              {versionsQuery.data && (
                <div className="space-y-1">
                  {versionsQuery.data.versions.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No version history available
                    </p>
                  )}
                  {versionsQuery.data.versions.map((version) => (
                    <VersionItem
                      key={version.versionId}
                      filePath={filePath}
                      version={version}
                      onLoad={handleLoadVersion}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <div className="text-sm">
            {statusMessage && (
              <span
                className={
                  statusMessage.type === 'success'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-destructive'
                }
              >
                {statusMessage.text}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              disabled={
                !isDirty ||
                saveMutation.isPending ||
                fileQuery.isLoading ||
                !!fileQuery.error
              }
              onClick={handleSave}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      {showConflictDialog && (
        <ConfirmDialog
          title="Conflict Detected"
          message="This file was modified by someone else since you loaded it. Reload to see the latest version?"
          confirmLabel="Reload"
          onConfirm={handleReload}
          onCancel={() => setShowConflictDialog(false)}
        />
      )}

      {showDiscardDialog && (
        <ConfirmDialog
          title="Unsaved Changes"
          message="You have unsaved changes. Discard them?"
          confirmLabel="Discard"
          onConfirm={onClose}
          onCancel={() => setShowDiscardDialog(false)}
        />
      )}
    </div>,
    document.body,
  )
}

function VersionItem({
  filePath,
  version,
  onLoad,
}: {
  filePath: string
  version: FileVersionsResponse['versions'][number]
  onLoad: (content: FileVersionContent) => void
}) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const content = await api.get<FileVersionContent>(
        `/files/versions/${encodeURIComponent(version.versionId)}?path=${encodeURIComponent(filePath)}`,
      )
      onLoad(content)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm hover:bg-accent"
      onClick={handleClick}
      disabled={loading}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {formatTimeAgo(version.lastModified)}
          </span>
          {version.isLatest && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
              Latest
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {version.versionId.slice(0, 12)}... &middot;{' '}
          {formatBytes(version.size)}
        </div>
      </div>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    </button>
  )
}
