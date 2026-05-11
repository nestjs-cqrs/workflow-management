import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Workflow Manager</CardTitle>
          <CardDescription>Sign in to manage workflow approvals</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => login('/')}>
            Sign in with Keycloak
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
