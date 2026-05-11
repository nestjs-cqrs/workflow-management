import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type WorkflowInstance } from '@/api/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Circle, XCircle } from 'lucide-react'

const STATE_MAP: Record<number, string> = {
  1: 'Active',
  2: 'Completed',
  3: 'Aborted',
  4: 'Suspended',
  5: 'Pending',
  6: 'Error',
}

export default function WorkflowDetailPage() {
  const { processId, instanceId } = useParams<{
    processId: string
    instanceId: string
  }>()
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery<WorkflowInstance>({
    queryKey: ['workflow', processId, instanceId],
    queryFn: () => api.get(`/workflows/${processId}/${instanceId}`),
    enabled: !!processId && !!instanceId,
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
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive-foreground">
          Workflow instance not found
        </div>
      </div>
    )
  }

  const instance = data
  const sortedNodes = [...instance.nodes].sort(
    (a, b) => new Date(a.enter).getTime() - new Date(b.enter).getTime(),
  )

  return (
    <div>
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/workflows')}>
        <ArrowLeft className="h-4 w-4" /> Back to Workflows
      </Button>

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold font-mono">
          {instance.id.substring(0, 12)}...
        </h1>
        <Badge variant={instance.state === 1 ? 'default' : instance.state === 2 ? 'success' : 'destructive'}>
          {STATE_MAP[instance.state] ?? `State ${instance.state}`}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Process</span>
              <span className="font-mono">{instance.processId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Started</span>
              <span>{new Date(instance.start).toLocaleString()}</span>
            </div>
            {instance.end && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ended</span>
                <span>{new Date(instance.end).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md bg-secondary p-3 text-xs">
              {JSON.stringify(instance.variables, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Node History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedNodes.map((node, i) => (
              <div
                key={`${node.name}-${i}`}
                className="flex items-center gap-3 rounded-md border px-4 py-2 text-sm"
              >
                {node.exit ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 animate-pulse text-primary" />
                )}
                <div className="flex-1">
                  <span className="font-medium">{node.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({node.type})
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(node.enter).toLocaleTimeString()}
                  {node.exit && ` - ${new Date(node.exit).toLocaleTimeString()}`}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
