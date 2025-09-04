'use client';

import { useState, useEffect } from 'react';
import { checkForUpdates, forceRefresh, VersionInfo } from '@/lib/version-check';
import { Button } from './button';
import { X } from 'lucide-react';

export const UpdateBanner = () => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    checkForUpdates().then(info => {
      if (info?.needsUpdate) {
        setVersionInfo(info);
      }
    });

    // Check for updates periodically (every 2 minutes)
    const interval = setInterval(async () => {
      const info = await checkForUpdates();
      if (info?.needsUpdate && !dismissed) {
        setVersionInfo(info);
      }
    }, 120000);

    return () => clearInterval(interval);
  }, [dismissed]);

  const handleUpdate = () => {
    setIsRefreshing(true);
    forceRefresh();
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVersionInfo(null);
  };

  if (!versionInfo?.needsUpdate || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 shadow-lg z-50 border-b border-blue-500">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="font-medium">New version available!</span>
          </div>
          <span className="text-blue-100 text-sm">
            Version {versionInfo.version} is ready
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleUpdate}
            disabled={isRefreshing}
            size="sm"
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-blue-50 font-medium"
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                Updating...
              </>
            ) : (
              'Update Now'
            )}
          </Button>
          
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="text-white hover:bg-blue-600 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
