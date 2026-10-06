import { useId, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { formatBytes } from '../../../services/tool-service.js';

export function FileDropzone({ accept, multiple, maxSize, onFiles, disabled }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function add(fileList) {
    if (!fileList || fileList.length === 0) return;
    onFiles?.([...fileList]);
    // Reset so the same file can be re-selected after removal.
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!disabled) add(e.dataTransfer?.files);
      }}
      className={`rounded-2xl border-2 border-dashed p-6 text-center ${
        dragOver ? 'border-[var(--color-primary)] bg-[#eef0ff]' : 'border-[var(--color-border)]'
      }`}
    >
      <Upload aria-hidden="true" className="mx-auto text-[var(--color-text-muted)]" />
      <p className="mt-2 text-sm">
        Drag files here, or{' '}
        <label htmlFor={inputId} className="font-semibold text-[var(--color-primary)] underline">
          choose files
        </label>
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={(accept || []).join(',')}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => add(e.target.files)}
        className="sr-only"
      />
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        Accepted: {(accept || []).join(', ') || 'any'} · max {formatBytes(maxSize)} per file
      </p>
    </div>
  );
}
