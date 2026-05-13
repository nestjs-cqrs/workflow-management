import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type PendingTask } from '@/api/client'
import { useWorkflowRegistry } from '@/hooks/useWorkflowRegistry'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, ChevronRight, X } from 'lucide-react'

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'less than an hour ago'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function PendingApprovalsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { workflows } = useWorkflowRegistry()

  const typeFilter = searchParams.get('type') ?? ''
  const stepFilter = searchParams.get('step') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'

  const { data, isLoading, error } = useQuery<PendingTask[]>({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.get('/approvals/pending'),
    refetchInterval: 15000,
  })

  function setFilter(key: string, value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      return next
    })
  }

  function clearFilters() {
    setSearchParams({})
  }

  const hasFilters = typeFilter || stepFilter

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive-foreground">
        Failed to load pending approvals
        <Button
          variant="outline"
          size="sm"
          className="ml-4"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    )
  }

  let tasks = data ?? []

  if (typeFilter) {
    tasks = tasks.filter((t) => t.processId === typeFilter)
  }
  if (stepFilter) {
    tasks = tasks.filter((t) => t.stepNumber === parseInt(stepFilter, 10))
  }

  tasks = [...tasks].sort((a, b) => {
    const timeA = new Date(a.startedAt).getTime()
    const timeB = new Date(b.startedAt).getTime()
    return sort === 'oldest' ? timeA - timeB : timeB - timeA
  })

  const allTasks = data ?? []
  const uniqueSteps = [...new Set(allTasks.map((t) => t.stepNumber))].sort(
    (a, b) => a - b,
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Pending Approvals</h1>
        <p className="text-sm text-muted-foreground">
          {tasks.length === 0
            ? 'No tasks waiting for your approval'
            : `${tasks.length} task${tasks.length > 1 ? 's' : ''} waiting for your review`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={typeFilter}
          onChange={(e) => setFilter('type', e.target.value)}
        >
          <option value="">All workflow types</option>
          {workflows.map((w) => (
            <option key={w.processId} value={w.processId}>
              {w.displayName}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={stepFilter}
          onChange={(e) => setFilter('step', e.target.value)}
        >
          <option value="">All steps</option>
          {uniqueSteps.map((s) => (
            <option key={s} value={s}>
              Step {s}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={sort}
          onChange={(e) => setFilter('sort', e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {hasFilters
                ? 'No tasks match your filters'
                : 'All caught up'}
            </p>
            {hasFilters && (
              <Button
                variant="link"
                size="sm"
                className="mt-2"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.processInstanceId}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() =>
                navigate(
                  `/approvals/${task.processId}/${task.processInstanceId}/review`,
                )
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {task.workflowDisplayName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 pt-1">
                      <span>
                        Step {task.stepNumber}: {task.stepLabel}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="uppercase">
                      {task.requiredRole}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatTimeAgo(task.startedAt)}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
              {Object.keys(task.highlightedVariables).length > 0 && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {Object.entries(task.highlightedVariables).map(
                      ([key, value]) => (
                        <span key={key}>
                          <span className="font-medium">{key}:</span>{' '}
                          <span className="font-mono">{value}</span>
                        </span>
                      ),
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
