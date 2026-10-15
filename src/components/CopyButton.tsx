'use client';
import { useState } from 'react';

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="mt-2 rounded border px-3 py-1"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); } catch {} }}>
      {ok ? 'Copied' : label}
    </button>
  );
}
