'use client';

import React, { useId, useState } from 'react';

export interface CommandSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Autocomplete suggestions shown while focused. */
  suggestions?: string[];
  placeholder?: string;
}

/** Heavy-outlined, terminal-style search box with clear button and autocomplete. */
export function CommandSearch({ value, onChange, suggestions = [], placeholder = 'Search members, notes, status…' }: CommandSearchProps) {
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const open = focused && suggestions.length > 0;

  return (
    <div className="cmd">
      <div className="cmd-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-label="Search entries"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {value && (
          <button type="button" className="cmd-clear" aria-label="Clear search" onClick={() => onChange('')}>
            ×
          </button>
        )}
      </div>

      {open && (
        <ul id={listId} role="listbox" className="cmd-list">
          {suggestions.map((s) => (
            <li key={s} role="option" aria-selected={false}>
              {/* mouse-down (not click) so it fires before the input loses focus */}
              <button type="button" onMouseDown={(e) => { e.preventDefault(); onChange(s); }}>
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CommandSearch;
