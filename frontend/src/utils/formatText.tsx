import React from 'react';

export function renderFormattedText(text: string, isUser: boolean = false): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong
          key={index}
          className={isUser ? 'font-bold text-white' : 'font-semibold text-slate-900'}
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic opacity-90">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part.replace(/\*\*/g, '');
  });
}
