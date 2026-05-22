'use client';

import { type ApiEndpoint } from './types';

interface Props {
  endpoints:     ApiEndpoint[];
  selectedPath:  string;
  selectedMethod: string;
  onPick:        (e: ApiEndpoint) => void;
}

const METHOD_STYLES: Record<string, string> = {
  GET:    'bg-moss-bg text-moss',
  POST:   'bg-sage-100 text-sage-900',
  PUT:    'bg-amber-bg text-amber',
  DELETE: 'bg-rust-bg text-rust',
};

export default function EndpointList({ endpoints, selectedPath, selectedMethod, onPick }: Props) {
  if (endpoints.length === 0) {
    return <div className="px-4 py-6 text-[12px] text-ink-3 italic">Pick a scope to load endpoints.</div>;
  }
  return (
    <ul className="space-y-0.5 p-2">
      {endpoints.map(e => {
        const active = e.path === selectedPath && e.method === selectedMethod;
        return (
          <li key={`${e.method}-${e.path}`}>
            <button
              onClick={() => onPick(e)}
              className={`w-full text-left flex items-start gap-2.5 px-2.5 py-2 rounded-sm transition-colors ${
                active ? 'bg-sage-50' : 'hover:bg-bg-sunken'
              }`}
            >
              <span
                className={`inline-block min-w-[44px] text-center font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${METHOD_STYLES[e.method] ?? ''}`}
              >
                {e.method}
              </span>
              <span className={`text-[13px] leading-tight ${active ? 'text-sage-900 font-medium' : 'text-ink-2'}`}>
                {e.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
