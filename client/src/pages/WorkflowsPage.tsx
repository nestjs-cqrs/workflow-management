import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, type PendingTask } from '@/api/client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GitBranch, Eye, XSquare } from 'lucide-react'

const STATE_LABELS: Record<number, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' }> = {
  1: { label: 'Active', variant: 'default' },
  2: { label: 'Completed', variant: 'success' },
  3: { label: 'Aborted', variant: 'destructive' },
  5: { label: 'Pending', variant: 'warning' },
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
          {workflows.map((wf) => (
            <Card key={wf.processInstanceId}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-mono">
                      {wf.processInstanceId.substring(0, 8)}...
                    </CardTitle>
                    <CardDescription>
                      {wf.processId} &middot; {wf.currentState}
                    </CardDescription>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(`/workflows/${wf.processId}/${wf.processInstanceId}`)
                  }
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
          ))}
        </div>
      )}
    </div>
  )
}
