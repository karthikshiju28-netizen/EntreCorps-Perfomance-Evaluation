'use client';
import { useState } from 'react';

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-ghost mt-3 min-h-9 text-xs"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); } catch {} }}>
      {ok ? 'Copied' : label}
    </button>
  );
}
