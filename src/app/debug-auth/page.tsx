"use client";

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, User, Mail, Calendar } from 'lucide-react';

export default function DebugAuthPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Auth error:', error);
      }
      
      setUser(user);
      setLoading(false);
    }

    checkAuth();
  }, []);

  const testSave = async () => {
    setTesting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      
      // Test saving a simple activity
      const { data, error } = await supabase
        .from('user_activities')
        .insert({
          activity_type: 'DEBUG_TEST',
          description: 'Testing save functionality from debug page',
          status: 'COMPLETED',
          metadata: { test: true, timestamp: new Date().toISOString() }
        })
        .select();

      if (error) {
        setTestResult({ success: false, error: error.message });
      } else {
        setTestResult({ success: true, data });
      }
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Checking authentication...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Authentication Debug</h1>
        <p className="text-muted-foreground">Check your authentication status and test database access</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Authenticated</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>User ID:</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{user.id}</code>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Not Authenticated</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database Test */}
        <Card>
          <CardHeader>
            <CardTitle>Database Access Test</CardTitle>
            <CardDescription>Test if you can save data to the database</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testSave} 
              disabled={!user || testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Save to Database'
              )}
            </Button>

            {testResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="font-medium">
                    {testResult.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                {testResult.error && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {testResult.error}
                  </p>
                )}
                {testResult.success && (
                  <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                    Data saved successfully! Check your dashboard to see the activity.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <div className="space-y-2">
              <p className="text-red-600 font-medium">You need to sign in to save data!</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to the <a href="/auth" className="text-blue-600 hover:underline">Auth page</a></li>
                <li>Sign up for a new account or sign in</li>
                <li>Come back to this page and test again</li>
                <li>Then try generating data - it should save properly</li>
              </ol>
            </div>
          ) : testResult?.success ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">Great! Your authentication is working.</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to the <a href="/dashboard/generate" className="text-blue-600 hover:underline">Generate page</a></li>
                <li>Generate some data</li>
                <li>Click "Save Dataset" after generation</li>
                <li>Check your <a href="/dashboard" className="text-blue-600 hover:underline">Dashboard</a> to see the data</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-yellow-600 font-medium">Authentication is working, but there might be a database issue.</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Check the browser console for errors</li>
                <li>Make sure you ran the database schema setup</li>
                <li>Try refreshing the page and testing again</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
