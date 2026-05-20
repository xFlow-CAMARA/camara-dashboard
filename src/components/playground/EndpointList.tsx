'use client';

import { type ApiEndpoint, METHOD_COLORS } from './types';

interface Props {
  endpoints:     ApiEndpoint[];
  selectedPath:  string;
  selectedMethod: string;
  onPick:        (e: ApiEndpoint) => void;
}

export default function EndpointList({ endpoints, selectedPath, selectedMethod, onPick }: Props) {
  if (endpoints.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-400 italic">
        Pick a scope above to load its endpoints.
      </div>
    );
  }

  return (
    <ul className="space-y-1 p-2">
      {endpoints.map(e => {
        const active = e.path === selectedPath && e.method === selectedMethod;
        return (
          <li key={`${e.method}-${e.path}`}>
            <button
              onClick={() => onPick(e)}
              className={`w-full text-left flex items-start gap-2 px-2 py-2 rounded-md transition-colors ${
                active ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
              }`}
            >
              <span className={`inline-block w-12 text-center font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded border ${METHOD_COLORS[e.method]}`}>
                {e.method}
              </span>
              <span className={`text-sm leading-tight ${active ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>
                {e.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
