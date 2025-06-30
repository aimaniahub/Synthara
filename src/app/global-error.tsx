'use client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '400px',
          padding: '20px'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#dc2626',
            margin: '0 0 20px 0'
          }}>Global Error</h1>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#111827',
            margin: '0 0 10px 0'
          }}>Something went wrong</h2>
          <p style={{
            color: '#6b7280',
            margin: '0 0 30px 0'
          }}>
            A global error occurred. Please try again.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={reset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
            <a 
              href="/dashboard"
              style={{
                display: 'block',
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                color: '#374151',
                textDecoration: 'none',
                borderRadius: '6px',
                textAlign: 'center'
              }}
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
