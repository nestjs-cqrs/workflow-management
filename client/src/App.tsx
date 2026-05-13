import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const PendingApprovalsPage = lazy(() => import('@/pages/PendingApprovalsPage'))
const WorkflowsPage = lazy(() => import('@/pages/WorkflowsPage'))
const WorkflowDetailPage = lazy(() => import('@/pages/WorkflowDetailPage'))
const TaskReviewPage = lazy(() => import('@/pages/TaskReviewPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PendingApprovalsPage />} />
              <Route
                path="approvals/:processId/:instanceId/review"
                element={<TaskReviewPage />}
              />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route
                path="workflows/:processId/:instanceId"
                element={<WorkflowDetailPage />}
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
