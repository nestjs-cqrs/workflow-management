import { useQuery } from '@tanstack/react-query'
import { api, type WorkflowTypeConfig } from '@/api/client'

interface RegistryResponse {
  workflows: WorkflowTypeConfig[]
}

export function useWorkflowRegistry() {
  const { data, isLoading, error } = useQuery<RegistryResponse>({
    queryKey: ['workflows', 'registry'],
    queryFn: () => api.get('/workflows/registry'),
    staleTime: 5 * 60 * 1000,
  })

  const workflows = data?.workflows ?? []

  function getByProcessId(processId: string): WorkflowTypeConfig | undefined {
    return workflows.find((w) => w.processId === processId)
  }

  return { workflows, isLoading, error, getByProcessId }
}
