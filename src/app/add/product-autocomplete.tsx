"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { ProductSuggestion, LocationType } from "@/lib/frequent-items";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: ProductSuggestion) => void;
  location: LocationType;
}

export function ProductAutocomplete({
  value,
  onChange,
  onSelect,
  location,
}: Props) {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string, loc: LocationType) => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/frequent-items/suggestions?q=${encodeURIComponent(query)}&location=${loc}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 1) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value, location);
        setIsOpen(true);
      }, 300);
    } else {
      // Show suggestions even with empty input
      fetchSuggestions("", location);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, location, fetchSuggestions]);

  // Load initial suggestions when location changes
  useEffect(() => {
    fetchSuggestions("", location);
  }, [location, fetchSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (suggestion: ProductSuggestion) => {
    onChange(suggestion.name);
    onSelect(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay closing to allow click on suggestion
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        id="name"
        name="name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="Ex: Sopa, Iogurte, Carne..."
        autoComplete="off"
        required
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
          role="listbox"
        >
          {isLoading && (
            <li className="px-4 py-2 text-sm text-slate-500">A carregar...</li>
          )}
          {!isLoading &&
            suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                role="option"
                aria-selected={highlightedIndex === index}
                className={`cursor-pointer px-4 py-3 transition ${
                  highlightedIndex === index
                    ? "bg-slate-100 dark:bg-slate-700"
                    : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                }`}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {suggestion.name}
                  </span>
                  {suggestion.isFrequent && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                      Frequente
                    </span>
                  )}
                </div>
                {suggestion.input_mode === "duration" &&
                  suggestion.default_duration_days && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {suggestion.default_duration_days} dias
                    </span>
                  )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
