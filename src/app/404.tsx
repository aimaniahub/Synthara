// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function Custom404() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        padding: '20px'
      }}>
        <h1 style={{
          fontSize: '4rem',
          fontWeight: 'bold',
          color: '#2563eb',
          margin: '0 0 20px 0'
        }}>404</h1>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 10px 0'
        }}>Page Not Found</h2>
        <p style={{
          color: '#6b7280',
          margin: '0 0 30px 0'
        }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <a 
            href="/dashboard"
            style={{
              display: 'block',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              textAlign: 'center'
            }}
          >
            Go to Dashboard
          </a>
          <a 
            href="/"
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
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
