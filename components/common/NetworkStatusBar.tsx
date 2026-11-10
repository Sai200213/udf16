import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const NetworkStatusBar: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let reconnectedTimer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Auto-hide the "Back online" message after 3 seconds
      reconnectedTimer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      clearTimeout(reconnectedTimer);
      setShowReconnected(false);
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearTimeout(reconnectedTimer);
    };
  }, []);

  // If online and not showing the temporary "Back online" banner, render nothing
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <aside
      aria-label="Network Connection Status"
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[100000] py-2 px-4 flex items-center justify-center gap-2 text-xs font-semibold shadow-md transition-all duration-300 animate-in slide-in-from-top-full ${
        !isOnline
          ? 'bg-amber-500 text-slate-950 border-b border-amber-600'
          : 'bg-emerald-600 text-white border-b border-emerald-700'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff size={16} className="animate-pulse flex-shrink-0" />
          <span>No internet connection. Waiting for network...</span>
        </>
      ) : (
        <>
          <Wifi size={16} className="flex-shrink-0" />
          <span>Back online! Reconnected to network.</span>
        </>
      )}
    </aside>
  );
};

export default NetworkStatusBar;

