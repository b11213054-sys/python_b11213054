import React, { useRef } from 'react';

interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  activeLine?: number | null;
  errorLine?: number | null;
  minHeightClass?: string;
  ariaLabel?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  activeLine = null,
  errorLine = null,
  minHeightClass = 'min-h-[340px]',
  ariaLabel = 'Python 程式碼編輯器',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = value.split('\n');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextValue = value.slice(0, start) + '    ' + value.slice(end);
      onChange(nextValue);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 4;
          textareaRef.current.selectionEnd = start + 4;
        }
      });
    }
  };

  return (
    <div className="relative flex w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-slate-100">
      {/* Line numbers gutter */}
      <div
        aria-hidden="true"
        className="select-none border-r border-slate-800 bg-slate-900/70 py-3.5 pl-3 pr-2.5 text-right font-mono text-xs leading-6 text-slate-500 tabular-nums"
      >
        {lines.map((_, idx) => {
          const lineNum = idx + 1;
          const isActive = activeLine === lineNum;
          const isError = errorLine === lineNum;
          return (
            <div
              key={lineNum}
              className={`px-1 rounded ${
                isError
                  ? 'bg-rose-500/25 text-rose-300 font-semibold'
                  : isActive
                    ? 'bg-blue-500/30 text-blue-200 font-semibold'
                    : ''
              }`}
            >
              {lineNum}
            </div>
          );
        })}
      </div>

      {/* Line highlight overlay + editable textarea */}
      <div className="relative flex-1 overflow-x-auto">
        {(activeLine !== null || errorLine !== null) && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 py-3.5">
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const isActive = activeLine === lineNum;
              const isError = errorLine === lineNum;
              return (
                <div
                  key={lineNum}
                  className={`h-6 w-full ${
                    isError
                      ? 'bg-rose-500/15'
                      : isActive
                        ? 'bg-blue-500/15'
                        : ''
                  }`}
                />
              );
            })}
          </div>
        )}
        <textarea
          ref={textareaRef}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          rows={Math.max(12, lines.length + 1)}
          className={`code-editor relative z-10 block w-full resize-y bg-transparent px-4 py-3.5 font-mono text-[13.5px] leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-500 ${minHeightClass}`}
        />
      </div>
    </div>
  );
};
