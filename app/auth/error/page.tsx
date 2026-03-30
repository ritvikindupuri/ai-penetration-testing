import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Authentication Error
        </h1>
        <p className="max-w-md text-muted-foreground">
          There was an error during authentication. This could be due to an expired
          link or an invalid request. Please try again.
        </p>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/sign-up">Create Account</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
