import React, { useState, useCallback } from 'react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
        border border-stone-300 bg-white text-stone-700 
        hover:bg-stone-50 hover:border-stone-400
        active:bg-stone-100
        transition-all duration-150
        ${copied ? 'bg-green-50 border-green-300 text-green-700' : ''}
        ${className}`}
    >
      {copied ? (
        <><span>✓</span> Copied</>
      ) : (
        <><span>📋</span> {label}</>
      )}
    </button>
  );
}
