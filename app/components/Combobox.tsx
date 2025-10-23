"use client";

import { useState, useRef, useEffect } from "react";
import { LucideIcon, X, Check } from "lucide-react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
  icon?: LucideIcon;
  header?: React.ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  expanded?: boolean;
}

export function Combobox({ value, onChange, options, placeholder, disabled, className, icon: Icon, header, onFocus, onBlur, expanded }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suppressOpenRef = useRef(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Auto-open dropdown when expanded
  useEffect(() => {
    if (expanded) {
      setIsOpen(true);
    }
  }, [expanded]);

  // Update filtered options when the available options or input value changes.
  useEffect(() => {
    const q = (inputValue || '').trim().toLowerCase();
    if (!q) {
      setFilteredOptions(options || []);
      return;
    }
    const starts: string[] = [];
    const contains: string[] = [];
    const separators: string[] = [];
    
    for (const opt of options || []) {
      if (opt.startsWith('───')) {
        separators.push(opt);
      } else {
        const low = opt.toLowerCase();
        if (low.startsWith(q)) starts.push(opt);
        else if (low.includes(q)) contains.push(opt);
      }
    }
    
    // Include separators and matching options
    setFilteredOptions([...separators, ...starts, ...contains]);
  }, [inputValue, options]);

  useEffect(() => {
    const restore: Array<() => void> = [];
    try {
      const inp = inputRef.current;
      if (inp) {
        const orig = (inp as any).focus;
        (inp as any).focus = function (...args: any[]) {
          if (!disabled) return orig.apply(this, args);
          return undefined;
        };
        restore.push(() => { try { (inp as any).focus = orig; } catch (_) {} });
      }
    } catch (_) {}
    // Also capture phase focusin to immediately blur if focus sneaks in
    const onFocusIn = (e: FocusEvent) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        if (target === inputRef.current && disabled) {
          try { (target as HTMLElement).blur(); } catch (_) {}
        }
      } catch (_) {}
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      try { document.removeEventListener('focusin', onFocusIn, true); } catch (_) {}
      for (const r of restore) r();
    };
  }, [disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleClear = () => {
    // If the dropdown is closed, just clear the value and don't focus
    if (!isOpen) {
      setInputValue('');
      onChange('');
      return;
    }

    // If dropdown is open, prevent the dropdown from reopening when we refocus
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    suppressOpenRef.current = true;
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
    // Clear the suppression on the next tick so future focuses behave normally
    setTimeout(() => { suppressOpenRef.current = false; }, 0);
  };

  const handleOptionSelect = (option: string) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    onBlur?.(); // Trigger blur to close expanded view
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    } else if (e.key === 'ArrowDown' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      (listRef.current?.firstElementChild as HTMLElement)?.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        listRef.current &&
        !listRef.current.contains(event.target as Node)
      ) {
        if (blurTimeoutRef.current) {
          clearTimeout(blurTimeoutRef.current);
          blurTimeoutRef.current = null;
        }
        setIsOpen(false);
        // Inform parent that the combobox effectively blurred due to outside click
        try { onBlur?.(); } catch (_) {}
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    // If focus occurred as a result of clearing the field, don't auto-open
    if (suppressOpenRef.current) {
      onFocus?.();
      return;
    }
    setIsOpen(true);
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay the blur to allow clicks on options to be processed first
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      onBlur?.();
    }, 150);
  };

  return (
    <div className={`combobox ${className || ''}`} style={{ position: 'relative' }}>
      {Icon && <Icon size={16} className={`input-icon ${value ? 'input-filled' : ''}`} />}
      <input
        ref={inputRef}
        type="text"
        className="input"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        readOnly={disabled}
        tabIndex={disabled ? -1 : 0}
        autoComplete="off"
        onMouseDown={(e) => { if (disabled) e.preventDefault(); }}
        style={{ width: '100%', cursor: disabled ? 'not-allowed' : 'text', paddingLeft: Icon ? 32 : undefined, paddingRight: inputValue ? 64 : undefined }}
      />
      {inputValue && !disabled && (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.blur()}
            className="confirm-button"
            title="Confirm"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            title="Clear"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          className="combobox-options"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            margin: 0,
            padding: 0,
            listStyle: 'none'
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking inside dropdown
        >
          {header && (
            <li 
              style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontSize: '12px' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {header}
            </li>
          )}
          {filteredOptions.map((option, index) => {
            const isSeparator = option.startsWith('───');
            return (
              <li
                key={option}
                tabIndex={isSeparator ? -1 : 0}
                onClick={() => !isSeparator && handleOptionSelect(option)}
                onKeyDown={(e) => {
                  if (isSeparator) return;
                  if (e.key === 'Enter') {
                    handleOptionSelect(option);
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = e.currentTarget.nextElementSibling as HTMLElement;
                    next?.focus();
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const prev = e.currentTarget.previousElementSibling as HTMLElement;
                    if (prev) {
                      prev.focus();
                    } else {
                      inputRef.current?.focus();
                    }
                  }
                }}
                style={{
                  padding: isSeparator ? '4px 12px' : '8px 12px',
                  cursor: isSeparator ? 'default' : 'pointer',
                  borderBottom: index < filteredOptions.length - 1 ? '1px solid var(--border-light)' : 'none',
                  fontSize: '12px',
                  fontWeight: isSeparator ? 'bold' : 'normal',
                  color: isSeparator ? 'var(--muted)' : 'inherit',
                  textAlign: isSeparator ? 'center' : 'left',
                  background: isSeparator ? 'var(--bg-elev)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isSeparator) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSeparator) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {option}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}