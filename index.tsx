/// <reference types="vite/client" />
// SECURITY: Global Privacy Hardening
// Disable console logging outputs IN PRODUCTION to prevent Accidental PII Leakage.
// We keep console.warn and console.error functional for troubleshooting.
if (import.meta.env.PROD) {
  const noop = () => { };
  console.log = noop;
  console.info = noop;
  console.debug = noop;
  console.table = noop;
}

// SECURITY: Enforce official custom domain to prevent Cloudflare WAF bypass via .web.app or .firebaseapp.com
if (typeof window !== 'undefined') {
  const h = window.location.hostname;
  if (h && (h.includes('.web.app') || h.includes('.firebaseapp.com'))) {
    let target = 'udfonline.in';
    if (h.includes('-admin')) target = 'admin.udfonline.in';
    else if (h.includes('-employee')) target = 'employee.udfonline.in';
    window.location.replace(`https://${target}${window.location.pathname}${window.location.search}${window.location.hash}`);
  }
}


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initNativeAppStyles } from './src/utils/capacitor-utils';

// Initialize native app CSS classes for Capacitor
initNativeAppStyles();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from './src/context/AuthContext';
import { DataProvider } from './src/contexts/DataContext';
import { NotificationProvider } from './src/contexts/NotificationContext';

import toast, { Toaster } from 'react-hot-toast';


// ─── DUAL-ENGINE ZERO-REFRESH AUTO-UPDATER ───────────────────────────────────
if (typeof window !== 'undefined') {
  const CURRENT_PAGE_LOAD_TIME = Date.now();
  let isUpdateReloading = false;

  const isUserActivelyTyping = (): boolean => {
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    const tag = activeEl.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || (activeEl as HTMLElement).isContentEditable;
  };

  const triggerSafeReload = (force = false) => {
    if (isUpdateReloading) return;

    if (!force && isUserActivelyTyping()) {
      // Protect user's typing in forms: Show a non-destructive floating banner instead of abruptly reloading
      if ((window as any).__UDF_UPDATE_PENDING) return;
      (window as any).__UDF_UPDATE_PENDING = true;
      toast(
        (t) => (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">New portal update available!</span>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                isUpdateReloading = true;
                window.location.reload();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm transition-colors"
            >
              Update Now
            </button>
          </div>
        ),
        { duration: Infinity, position: 'bottom-right' }
      );
      return;
    }

    isUpdateReloading = true;
    window.location.reload();
  };

  // 1. Service Worker Update Trigger (Employee Portal & Public Site)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      triggerSafeReload();
    });

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });
      setInterval(() => reg.update().catch(() => {}), 15 * 60 * 1000);
    }).catch(() => {});
  }

  // 2. Dual-Engine Background Probe (Works on Admin Portal where SW is disabled, and for all browsers)
  const checkVersionProbe = async () => {
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && typeof data.buildTime === 'number' && data.buildTime > CURRENT_PAGE_LOAD_TIME) {
        triggerSafeReload();
      }
    } catch (_) {}
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersionProbe();
    }
  });
  setInterval(checkVersionProbe, 15 * 60 * 1000); // Check every 15 mins

  // 3. Catch Vite lazy-loaded chunk 404s after new deploys (Eliminates white-screen crashes)
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerSafeReload(true);
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <BrowserRouter>
            <App />
            <Toaster position="top-right" />
          </BrowserRouter>
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);
