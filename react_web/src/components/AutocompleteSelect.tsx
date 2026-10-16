import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

function clampIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return Math.min(Math.max(0, i), len - 1);
}

type Props = {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  hint?: string;
};

export function AutocompleteSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  loading,
  hint,
}: Props) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim();
    if (!q) return options.slice(0, 100);
    return options.filter((o) => o.includes(q));
  }, [options, value]);

  const safeHighlight = clampIndex(highlight, filtered.length);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const selectOption = useCallback(
    (opt: string) => {
      onChange(opt);
      setOpen(false);
    },
    [onChange]
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => clampIndex(clampIndex(h, filtered.length) + 1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => clampIndex(clampIndex(h, filtered.length) - 1, filtered.length));
    } else if (e.key === 'Enter' && open && filtered[safeHighlight] !== undefined) {
      e.preventDefault();
      selectOption(filtered[safeHighlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <label className="field">
      <span>{label}</span>
      <div className="autocomplete" ref={wrapRef}>
        <input
          id={baseId}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled || loading}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          onKeyDown={onKeyDown}
        />
        {loading ? <span className="muted small">読み込み中…</span> : null}
        {hint && !loading ? (
          <p className="muted small" style={{ margin: 0 }}>
            {hint}
          </p>
        ) : null}
        {open && filtered.length > 0 ? (
          <ul id={listId} className="autocomplete-list" role="listbox">
            {filtered.map((opt, i) => (
              <li
                key={`${opt}-${i}`}
                role="option"
                aria-selected={i === safeHighlight}
                className={
                  i === safeHighlight ? 'autocomplete-item autocomplete-item--active' : 'autocomplete-item'
                }
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  selectOption(opt);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </label>
  );
}
