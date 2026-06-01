'use client';

import { useState, useEffect } from 'react';
import { Free5GCAdapter } from '@/lib/adapters/free5gc-tfsdk';
import type { CamaraApiId } from '@/lib/types/camara';

interface NotSupportedBannerProps {
  apiId: CamaraApiId;
  children?: React.ReactNode;
}

/**
 * Renders a "Not Supported" banner when the currently selected 5G core adapter
 * does not support the given CAMARA API.
 *
 * When children are provided, they are rendered in a disabled overlay beneath
 * the banner so the form layout is visible but non-interactive.
 *
 * Returns null (or children unwrapped) when the current adapter supports the API.
 */
export default function NotSupportedBanner({ apiId, children }: NotSupportedBannerProps) {
  const [unsupported, setUnsupported] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [adapterName, setAdapterName] = useState<string>('');

  useEffect(() => {
    // Header.tsx writes 'selectedCore'; AdapterSelector writes 'selectedAdapter'
    const saved =
      localStorage.getItem('selectedCore') ||
      localStorage.getItem('selectedAdapter') ||
      'coresim';
    if (saved === 'free5gc') {
      const isUnsupported = (Free5GCAdapter.unsupportedApis as readonly string[]).includes(apiId);
      if (isUnsupported) {
        setUnsupported(true);
        setReason(Free5GCAdapter.unsupportedReasons[apiId] ?? 'This API is not supported by free5GC.');
        setAdapterName('free5GC');
      }
    }
  }, [apiId]);

  if (!unsupported) return <>{children}</>;


  return (
    <>
    <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-orange-800">
              Not Supported by {adapterName}
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-200 text-orange-800">
              {adapterName}
            </span>
          </div>
          <p className="mt-1 text-sm text-orange-700">{reason}</p>
          <p className="mt-2 text-xs text-orange-600">
            Switch to <strong>CoreSim</strong> in the 5G Core Backend selector to use this API.
          </p>
        </div>
      </div>
    </div>

    {children && (
      <div className="relative pointer-events-none select-none">
        <div className="opacity-40">{children}</div>
        <div className="absolute inset-0 bg-white/30 rounded-lg" aria-hidden="true" />
      </div>
    )}
  </>
  );
}
