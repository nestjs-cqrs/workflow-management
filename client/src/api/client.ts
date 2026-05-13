const API_BASE = '/api'
const AUTH_BASE = '/auth'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': crypto.randomUUID(),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const problem = await response.json().catch(() => ({
      type: 'unknown',
      title: response.statusText,
      status: response.status,
    }))
    throw new ApiError(response.status, problem)
  }

  return response.json()
}

interface ProblemDetails {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
  correlationId?: string
  errors?: Array<{ field?: string; message: string }>
}

export class ApiError extends Error {
  public readonly title: string
  public readonly detail: string | undefined
  public readonly correlationId: string | undefined
  public readonly validationErrors: Array<{ field?: string; message: string }> | undefined

  constructor(
    public readonly status: number,
    problem: ProblemDetails,
  ) {
    super(problem.detail ?? problem.title)
    this.name = 'ApiError'
    this.title = problem.title
    this.detail = problem.detail
    this.correlationId = problem.correlationId
    this.validationErrors = problem.errors
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }
}

export const api = {
  get: <T>(path: string) => request<T>(`${API_BASE}${path}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(`${API_BASE}${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(`${API_BASE}${path}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(`${API_BASE}${path}`, { method: 'DELETE' }),
}

export const authApi = {
  me: () => request<AuthUser>(`${AUTH_BASE}/me`),
  logout: () => request<void>(`${AUTH_BASE}/logout`, { method: 'POST' }),
  getLoginUrl: (returnTo = '/', provider?: string) => {
    const params = new URLSearchParams({ returnTo })
    if (provider) params.set('provider', provider)
    return `${AUTH_BASE}/login?${params}`
  },
}

export interface AuthUser {
  keycloakId: string
  email: string
  displayName: string
  roles: string[]
}

export interface PendingTask {
  processInstanceId: string
  processId: string
  currentState: string
  requiredRole: string
  variables: Record<string, unknown>
  startedAt: string
  stepNumber: number
  stepLabel: string
  workflowDisplayName: string
  highlightedVariables: Record<string, string>
  nodeCount: number
}

export interface VariableFieldConfig {
  key: string
  label: string
  group: string
  isMarkdown?: boolean
  isHidden?: boolean
  isHighlighted?: boolean
}

export interface WorkflowTypeConfig {
  processId: string
  displayName: string
  description: string
  approvalNodePattern: string
  variableSchema: VariableFieldConfig[]
  stepLabels: Record<string, string>
  variableGroups: Record<string, string>
}

export interface TimelineNode {
  name: string
  type: string
  enter: string
  exit?: string
}

export interface TimelineStep {
  stepNumber: number
  label: string
  status: 'completed' | 'active' | 'pending'
  enterTime?: string
  exitTime?: string
  durationMs?: number
  detail?: string
  feedback?: string
  nodes: TimelineNode[]
}

export interface TaskReviewTask {
  processInstanceId: string
  processId: string
  currentState: string
  requiredRole: string
  stepNumber: number
  stepLabel: string
  variables: Record<string, unknown>
  startedAt: string
  isActive: boolean
}

export interface TaskReviewResponse {
  task: TaskReviewTask
  timeline: TimelineStep[]
  workflowConfig?: WorkflowTypeConfig
}

export interface WorkflowInstance {
  id: string
  processId: string
  state: number
  variables: Record<string, unknown>
  nodes: Array<{
    name: string
    type: string
    enter: string
    exit?: string
  }>
  start: string
  end?: string
}
