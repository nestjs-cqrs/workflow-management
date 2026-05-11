import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, type PendingTask } from '@/api/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GitBranch, Eye, XSquare, Clock, User, FolderOpen } from 'lucide-react'

function parseStepInfo(state: string): { step: number; role: string; phase: string } {
  const waitApproval = state.match(/WaitApprovalStep(\d+)_(\w+)/)
  if (waitApproval) {
    return { step: parseInt(waitApproval[1]!, 10), role: waitApproval[2]!.toUpperCase(), phase: 'Pending Approval' }
  }
  const waitGen = state.match(/WaitGenStep(\d+)/)
  if (waitGen) {
    return { step: parseInt(waitGen[1]!, 10), role: '', phase: 'Generating' }
  }
  const generate = state.match(/GenerateStep(\d+)/)
  if (generate) {
    return { step: parseInt(generate[1]!, 10), role: '', phase: 'Generating' }
  }
  return { step: 0, role: '', phase: state }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'less than an hour ago'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function extractBrdName(brdObjectKey: string): string {
  const parts = brdObjectKey.split('/')
  const filename = parts[parts.length - 1] ?? brdObjectKey
  return filename.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\..*$/, '')
}

export default function WorkflowsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery<PendingTask[]>({
    queryKey: ['workflows'],
    queryFn: () => api.get('/workflows'),
    refetchInterval: 15000,
  })

  const cancelMutation = useMutation({
    mutationFn: ({ processId, instanceId }: { processId: string; instanceId: string }) =>
      api.post(`/workflows/${processId}/${instanceId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
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
        Failed to load workflows
      </div>
    )
  }

  const workflows = data ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Workflows</h1>
        <p className="text-sm text-muted-foreground">
          {workflows.length} active workflow instance{workflows.length !== 1 ? 's' : ''}
        </p>
      </div>

      {workflows.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <GitBranch className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No active workflows</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const { step, role, phase } = parseStepInfo(wf.currentState)
            const pipelineRunId = wf.variables['pipelineRunId'] as string | undefined
            const brdObjectKey = wf.variables['brdObjectKey'] as string | undefined
            const commandType = wf.variables['__commandType'] as string | undefined

            return (
              <Card
                key={wf.processInstanceId}
                className="cursor-pointer transition-colors hover:border-primary/50"
                onClick={() => navigate(`/workflows/${wf.processId}/${wf.processInstanceId}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {wf.processId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {pipelineRunId && (
                          <span className="flex items-center gap-1 font-mono text-xs">
                            <GitBranch className="h-3 w-3" />
                            {pipelineRunId.substring(0, 8)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(wf.startedAt)}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={phase === 'Pending Approval' ? 'warning' : 'secondary'}>
                        {phase}
                      </Badge>
                      {step > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Step {step}/8
                          {role && (
                            <span className="ml-1 inline-flex items-center gap-0.5">
                              <User className="inline h-3 w-3" />
                              {role}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {brdObjectKey && (
                  <CardContent className="pt-0 pb-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderOpen className="h-3 w-3 shrink-0" />
                      <span className="truncate font-mono">{brdObjectKey}</span>
                    </div>
                  </CardContent>
                )}

                <CardContent className="flex gap-2 pt-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/workflows/${wf.processId}/${wf.processInstanceId}`)}
                  >
                    <Eye className="h-4 w-4" />
                    Details
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive-foreground"
                    disabled={cancelMutation.isPending}
                    onClick={() =>
                      cancelMutation.mutate({
                        processId: wf.processId,
                        instanceId: wf.processInstanceId,
                      })
                    }
                  >
                    <XSquare className="h-4 w-4" />
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
