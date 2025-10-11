"use client";

import { useState, useRef, useEffect } from "react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({ value, onChange, options, placeholder, disabled, className }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (inputValue.trim() === '') {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [inputValue, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    } else if (e.key === 'ArrowDown' && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      (listRef.current?.firstElementChild as HTMLElement)?.focus();
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Delay closing to allow option selection
    setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div className={`combobox ${className || ''}`} style={{ position: 'relative' }}>
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
        disabled={disabled}
        autoComplete="off"
        style={{ width: '100%' }}
      />
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
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              tabIndex={0}
              onClick={() => handleOptionSelect(option)}
              onKeyDown={(e) => {
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
                padding: '8px 12px',
                cursor: 'pointer',
                borderBottom: index < filteredOptions.length - 1 ? '1px solid var(--border-light)' : 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}