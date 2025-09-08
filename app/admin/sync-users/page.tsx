'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SyncUsersPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [specificUserId, setSpecificUserId] = useState('8add881f-c0cf-45cc-9038-159d9b511390'); // Pre-fill with the problematic user ID

  const syncAllUsers = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/sync-user-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncAll: true }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const syncSpecificUser = async () => {
    if (!specificUserId.trim()) {
      setResult({
        success: false,
        message: 'Please enter a user ID'
      });
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/sync-user-manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authUserId: specificUserId.trim() }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Sync Admin</h1>
        <p className="text-gray-600 mt-2">
          Manually sync users between Supabase auth and simple_users table
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sync All Users</CardTitle>
            <CardDescription>
              Sync all users from auth.users to simple_users table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={syncAllUsers} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Syncing...' : 'Sync All Users'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Specific User</CardTitle>
            <CardDescription>
              Sync a specific user by their auth user ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userId">Auth User ID</Label>
              <Input
                id="userId"
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                placeholder="Enter auth user ID"
                className="mt-1"
              />
            </div>
            <Button 
              onClick={syncSpecificUser} 
              disabled={loading || !specificUserId.trim()}
              className="w-full"
            >
              {loading ? 'Syncing...' : 'Sync User'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.success ? '✅ Success' : '❌ Error'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Message:</strong> {result.message}</p>
              {result.synced !== undefined && (
                <p><strong>Users Synced:</strong> {result.synced}</p>
              )}
              {result.errors !== undefined && (
                <p><strong>Errors:</strong> {result.errors}</p>
              )}
              {result.error && (
                <p><strong>Error Details:</strong> {result.error}</p>
              )}
            </div>
            
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600">
                Raw Response
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold">Database Fix (Recommended):</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 ml-4">
              <li>Go to your Supabase Dashboard → SQL Editor</li>
              <li>Run the SQL script: <code className="bg-gray-100 px-1 rounded">scripts/fix-user-sync-immediate.sql</code></li>
              <li>This will fix the database triggers and sync all existing users</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-semibold">Manual Sync (Fallback):</h4>
            <p className="text-sm text-gray-600">
              Use the buttons above to manually sync users if the database triggers are not working.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 