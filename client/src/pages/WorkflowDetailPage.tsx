import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type WorkflowInstance } from '@/api/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CheckCircle2, Circle, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const STATE_MAP: Record<number, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' }> = {
  1: { label: 'Active', variant: 'default' },
  2: { label: 'Completed', variant: 'success' },
  3: { label: 'Aborted', variant: 'destructive' },
  4: { label: 'Suspended', variant: 'warning' },
  5: { label: 'Pending', variant: 'warning' },
  6: { label: 'Error', variant: 'destructive' },
}

const VARIABLE_LABELS: Record<string, string> = {
  projectId: 'Project',
  pipelineRunId: 'Pipeline Run',
  createdById: 'Created By',
  brdObjectKey: 'BRD Document',
  stepResultId: 'Step Result',
  __commandType: 'Initiated By',
  acknowledged: 'Acknowledged',
}

const INTERNAL_KEYS = new Set(['genResult', 'approvalResult', 'step1Feedback', 'step2Feedback', 'step3Feedback', 'step4Feedback', 'step5Feedback', 'step6Feedback', 'step7Feedback', 'step8Feedback'])

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

function formatVariableValue(key: string, value: unknown): string {
  if (key === '__commandType') return String(value).replace(/Command$/, '')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

interface StepDisplay {
  key: string
  label: string
  detail: string
  status: 'completed' | 'active' | 'pending'
  time: string
}

const STEP_LABELS: Record<string, string> = {
  GenerateStep: 'Generate',
  WaitGenStep: 'Waiting for Generation',
  WaitApprovalStep: 'Waiting for Approval',
  EvalStep: 'Evaluating',
  RejectStep: 'Rejected',
}

function deriveSteps(nodes: WorkflowInstance['nodes']): StepDisplay[] {
  const TOTAL_STEPS = 8
  const steps: StepDisplay[] = []

  for (let s = 1; s <= TOTAL_STEPS; s++) {
    const stepNodes = nodes.filter((n) => {
      const match = n.name.match(/(?:GenerateStep|WaitGenStep|WaitApprovalStep|EvalStep|RejectStep)(\d+)/)
      return match && parseInt(match[1]!, 10) === s
    })

    if (stepNodes.length === 0) {
      steps.push({ key: `step-${s}`, label: `Step ${s}`, detail: '', status: 'pending', time: '' })
      continue
    }

    const activeNode = stepNodes.find((n) => !n.exit)
    const lastNode = stepNodes[stepNodes.length - 1]!

    let detail = ''
    let status: StepDisplay['status'] = 'completed'

    if (activeNode) {
      status = 'active'
      const nameMatch = activeNode.name.match(/(GenerateStep|WaitGenStep|WaitApprovalStep|EvalStep|RejectStep)\d+_?(\w+)?/)
      if (nameMatch) {
        detail = STEP_LABELS[nameMatch[1]!] ?? nameMatch[1]!
        if (nameMatch[2]) detail += ` (${nameMatch[2].toUpperCase()})`
      }
    } else {
      const rejected = stepNodes.find((n) => n.name.startsWith('RejectStep'))
      if (rejected) detail = 'Rejected — regenerating'
      const approved = stepNodes.find((n) => n.name.startsWith('EvalStep') && n.exit)
      if (approved && !rejected) detail = 'Approved'
    }

    const enterTime = new Date(stepNodes[0]!.enter).toLocaleTimeString()
    const exitTime = lastNode.exit ? new Date(lastNode.exit).toLocaleTimeString() : ''

    steps.push({
      key: `step-${s}`,
      label: `Step ${s}`,
      detail,
      status,
      time: exitTime ? `${enterTime} - ${exitTime}` : enterTime,
    })
  }

  return steps
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
  const stateInfo = STATE_MAP[instance.state] ?? { label: `State ${instance.state}`, variant: 'default' as const }
  const sortedNodes = [...instance.nodes].sort(
    (a, b) => new Date(a.enter).getTime() - new Date(b.enter).getTime(),
  )

  const variables = instance.variables ?? {}
  const commandType = variables['__commandType'] as string | undefined
  const knownKeys = Object.keys(variables).filter((k) => k in VARIABLE_LABELS)
  const extraKeys = Object.keys(variables).filter((k) => !(k in VARIABLE_LABELS) && !INTERNAL_KEYS.has(k))

  return (
    <div>
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/workflows')}>
        <ArrowLeft className="h-4 w-4" /> Back to Workflows
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {instance.processId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </h1>
        <div className="mt-1 flex items-center gap-3">
          <span className="font-mono text-sm text-muted-foreground">{instance.id}</span>
          <CopyButton value={instance.id} />
          <Badge variant={stateInfo.variant}>{stateInfo.label}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Process</span>
              <span className="font-mono">{instance.processId}</span>
            </div>
            {commandType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Initiated By</span>
                <span>{commandType.replace(/Command$/, '')}</span>
              </div>
            )}
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
            <CardTitle className="text-base">Workflow Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {knownKeys
              .filter((k) => k !== '__commandType')
              .map((key) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">
                    {VARIABLE_LABELS[key] ?? key}
                  </span>
                  <div className="flex items-center gap-1 text-right">
                    <span className="break-all font-mono text-xs">
                      {formatVariableValue(key, variables[key])}
                    </span>
                    {typeof variables[key] === 'string' && String(variables[key]).length > 8 && (
                      <CopyButton value={String(variables[key])} />
                    )}
                  </div>
                </div>
              ))}
            {extraKeys.map((key) => (
              <div key={key} className="flex items-start justify-between gap-4">
                <span className="shrink-0 text-muted-foreground">{key}</span>
                <span className="break-all font-mono text-xs text-right">
                  {typeof variables[key] === 'object'
                    ? JSON.stringify(variables[key])
                    : String(variables[key])}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Step Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deriveSteps(sortedNodes).map((step) => (
              <div
                key={step.key}
                className="flex items-center gap-3 rounded-md border px-4 py-3 text-sm"
              >
                {step.status === 'completed' && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                )}
                {step.status === 'active' && (
                  <Circle className="h-4 w-4 shrink-0 animate-pulse text-primary" />
                )}
                {step.status === 'pending' && (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
                <div className="flex-1">
                  <span className="font-medium">{step.label}</span>
                  {step.detail && (
                    <span className="ml-2 text-xs text-muted-foreground">{step.detail}</span>
                  )}
                </div>
                {step.time && (
                  <span className="text-xs text-muted-foreground">{step.time}</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
