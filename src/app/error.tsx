'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SyntharaLogo } from '@/components/icons/SyntharaLogo'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <SyntharaLogo className="h-16 w-auto mx-auto" />
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-destructive">Oops!</h1>
          <h2 className="text-2xl font-semibold text-foreground">Something went wrong</h2>
          <p className="text-muted-foreground">
            We encountered an unexpected error. Please try again.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Button variant="outline" asChild className="w-full">
            <a href="/dashboard">Go to Dashboard</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
