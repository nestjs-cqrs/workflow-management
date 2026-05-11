import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type PendingTask } from '@/api/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

function parseStepInfo(state: string): { step: number; role: string } {
  const match = state.match(/WaitApprovalStep(\d+)_(\w+)/)
  return {
    step: match ? parseInt(match[1]!, 10) : 0,
    role: match?.[2]?.toUpperCase() ?? '',
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'less than an hour ago'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function PendingApprovalsPage() {
  const queryClient = useQueryClient()
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const { data, isLoading, error } = useQuery<PendingTask[]>({
    queryKey: ['approvals', 'pending'],
    queryFn: () => api.get('/approvals/pending'),
    refetchInterval: 15000,
  })

  const approveMutation = useMutation({
    mutationFn: (task: PendingTask) =>
      api.post(`/approvals/${task.processInstanceId}/approve`, {
        processId: task.processId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ task, feedback }: { task: PendingTask; feedback: string }) =>
      api.post(`/approvals/${task.processInstanceId}/reject`, {
        processId: task.processId,
        feedback,
      }),
    onSuccess: () => {
      setRejectingId(null)
      setFeedback('')
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })

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
      </div>
    )
  }

  const tasks = data ?? []

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

      {tasks.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">All caught up</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const { step, role } = parseStepInfo(task.currentState)
            const isRejecting = rejectingId === task.processInstanceId
            const pipelineRunId = task.variables['pipelineRunId'] as string | undefined

            return (
              <Card key={task.processInstanceId}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        Step {step} Approval
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 pt-1">
                        <Clock className="h-3 w-3" />
                        Started {formatTimeAgo(task.startedAt)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{task.processId}</Badge>
                      <Badge variant="outline" className="uppercase">
                        {role}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {pipelineRunId && (
                    <p className="text-xs text-muted-foreground">
                      Pipeline Run: {pipelineRunId}
                    </p>
                  )}

                  {isRejecting && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        rows={3}
                        placeholder="Explain why you're rejecting this step..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>

                <CardFooter className="gap-2">
                  {isRejecting ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!feedback.trim() || rejectMutation.isPending}
                        onClick={() =>
                          rejectMutation.mutate({ task, feedback })
                        }
                      >
                        {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingId(null)
                          setFeedback('')
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(task)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectingId(task.processInstanceId)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
