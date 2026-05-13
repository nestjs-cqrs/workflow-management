import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type TaskReviewResponse } from '@/api/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react'

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="ml-1 inline-flex text-muted-foreground hover:text-foreground"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'unknown'
  const time = new Date(dateStr).getTime()
  if (isNaN(time)) return 'unknown'
  const diff = Date.now() - time
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'less than an hour ago'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`
}

export default function TaskReviewPage() {
  const { processId, instanceId } = useParams<{
    processId: string
    instanceId: string
  }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [approveComment, setApproveComment] = useState('')

  const { data, isLoading, error } = useQuery<TaskReviewResponse>({
    queryKey: ['approvals', 'review', instanceId],
    queryFn: () =>
      api.get(`/approvals/${instanceId}/review?processId=${processId}`),
    enabled: !!processId && !!instanceId,
    refetchInterval: 15000,
  })

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post(`/approvals/${instanceId}/approve`, {
        processId,
        comment: approveComment || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      navigate('/')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () =>
      api.post(`/approvals/${instanceId}/reject`, {
        processId,
        feedback,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      navigate('/')
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive-foreground">
          {error instanceof Error ? error.message : 'Task not found'}
        </div>
      </div>
    )
  }

  const { task, timeline, workflowConfig } = data
  const isActive = task.isActive

  const variableGroups = workflowConfig?.variableGroups ?? {}
  const variableSchema = workflowConfig?.variableSchema ?? []
  const schemaMap = new Map(variableSchema.map((f) => [f.key, f]))
  const allVarKeys = Object.keys(task.variables)

  const grouped = new Map<string, Array<{ key: string; label: string; value: unknown; isMarkdown: boolean }>>()
  const ungroupedVars: Array<{ key: string; value: unknown }> = []

  for (const key of allVarKeys) {
    const value = task.variables[key]
    if (value === null || value === undefined) continue

    const field = schemaMap.get(key)
    if (field?.isHidden) continue

    if (field) {
      const groupKey = field.group
      const existing = grouped.get(groupKey) ?? []
      existing.push({
        key,
        label: field.label,
        value,
        isMarkdown: field.isMarkdown ?? false,
      })
      grouped.set(groupKey, existing)
    } else {
      ungroupedVars.push({ key, value })
    }
  }

  return (
    <div className="pb-28">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <button className="hover:text-foreground" onClick={() => navigate('/')}>
          Pending Approvals
        </button>
        <span>/</span>
        <span>{workflowConfig?.displayName ?? task.processId}</span>
        <span>/</span>
        <span>
          Step {task.stepNumber}: {task.stepLabel}
        </span>
      </div>

      {/* Already handled banner */}
      {!isActive && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/50 bg-warning/10 p-4 text-warning-foreground">
          <AlertTriangle className="h-5 w-5" />
          <span>This task has already been handled by another user.</span>
        </div>
      )}

      {/* Header card */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {workflowConfig?.displayName ?? task.processId}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Step {task.stepNumber}: {task.stepLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="uppercase">
                {task.requiredRole}
              </Badge>
              <Badge variant="secondary">
                <Clock className="mr-1 h-3 w-3" />
                {formatTimeAgo(task.startedAt)}
              </Badge>
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs text-muted-foreground">
            <span className="font-mono">{task.processInstanceId}</span>
            <CopyButton value={task.processInstanceId} />
          </div>
        </CardHeader>
      </Card>

      {/* Variables card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Workflow Data</CardTitle>
        </CardHeader>
        <CardContent>
          {allVarKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No workflow data available
            </p>
          ) : (
            <div className="space-y-6">
              {Array.from(grouped.entries()).map(([groupKey, fields]) => (
                <div key={groupKey}>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    {variableGroups[groupKey] ?? groupKey}
                  </h4>
                  <div className="space-y-2">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {field.label}
                        </span>
                        <div className="text-right">
                          {field.isMarkdown &&
                          typeof field.value === 'string' &&
                          field.value ? (
                            <MarkdownRenderer content={field.value} />
                          ) : (
                            <span className="break-all font-mono text-xs">
                              {field.value == null
                                ? '—'
                                : typeof field.value === 'object'
                                  ? JSON.stringify(field.value)
                                  : String(field.value)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {ungroupedVars.length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                    Other
                  </h4>
                  <div className="space-y-2">
                    {ungroupedVars.map(({ key, value }) => (
                      <div
                        key={key}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <span className="shrink-0 text-muted-foreground">
                          {key}
                        </span>
                        <span className="break-all font-mono text-xs text-right">
                          {value == null
                            ? '—'
                            : typeof value === 'object'
                              ? JSON.stringify(value)
                              : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Step Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {timeline.map((step) => (
              <div
                key={step.stepNumber}
                className="flex items-start gap-3 rounded-md border px-4 py-3 text-sm"
              >
                {step.status === 'completed' && (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                )}
                {step.status === 'active' && (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-primary" />
                )}
                {step.status === 'pending' && (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      Step {step.stepNumber}: {step.label}
                    </span>
                    {step.status === 'active' && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  {step.detail && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {step.detail}
                    </p>
                  )}
                  {step.feedback && (
                    <div className="mt-2 rounded border bg-muted/50 p-2 text-xs">
                      <span className="font-medium">Feedback:</span>{' '}
                      {step.feedback}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {step.durationMs != null && (
                    <div>{formatDuration(step.durationMs)}</div>
                  )}
                  {step.enterTime && (
                    <div>
                      {new Date(step.enterTime).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sticky action bar */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg md:left-64">
          <div className="mx-auto max-w-4xl">
            {showRejectForm && (
              <div className="mb-3 space-y-2">
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                  placeholder="Explain why you're rejecting this step (min 10 characters)..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>
            )}
            {!showRejectForm && (
              <div className="mb-3">
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={2}
                  placeholder="Optional comment..."
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-2">
              {showRejectForm ? (
                <>
                  <Button
                    variant="destructive"
                    disabled={
                      feedback.trim().length < 10 || rejectMutation.isPending
                    }
                    onClick={() => rejectMutation.mutate()}
                  >
                    {rejectMutation.isPending
                      ? 'Rejecting...'
                      : 'Confirm Rejection'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowRejectForm(false)
                      setFeedback('')
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate()}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {approveMutation.isPending ? 'Approving...' : 'Approve'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(true)}
                  >
                    Reject
                  </Button>
                </>
              )}
            </div>
            {(approveMutation.error || rejectMutation.error) && (
              <p className="mt-2 text-sm text-destructive">
                {approveMutation.error instanceof Error
                  ? approveMutation.error.message
                  : rejectMutation.error instanceof Error
                    ? rejectMutation.error.message
                    : 'Action failed'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
