'use client';

import { useEffect } from 'react';

export function ErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Prevent the default browser behavior
      event.preventDefault();
      
      // Log the error for debugging
      if (event.reason instanceof Error) {
        console.error('Error details:', {
          message: event.reason.message,
          stack: event.reason.stack,
          name: event.reason.name
        });
      } else {
        console.error('Rejection reason:', event.reason);
      }
    };

    // Handle uncaught errors
    const handleError = (event: ErrorEvent) => {
      console.error('Uncaught error:', event.error);
      
      // Log the error for debugging
      if (event.error instanceof Error) {
        console.error('Error details:', {
          message: event.error.message,
          stack: event.error.stack,
          name: event.error.name
        });
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null; // This component doesn't render anything
}
