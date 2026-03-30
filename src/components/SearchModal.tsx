/**
 * Search Modal
 * 
 * Full-text search across all vault notes with fuzzy matching.
 * Supports keyboard navigation (arrow keys + Enter).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SearchResult } from '../types';
import { debounce, getNoteName } from '../utils/helpers';
import { getAPI } from '../utils/api';

interface SearchModalProps {
  onClose: () => void;
  onSelect: (path: string) => void;
}

const api = getAPI();

export function SearchModal({ onClose, onSelect }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      const res = await api.search(searchQuery);
      setResults(res);
      setSelectedIndex(0);
    }, 200),
    []
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    performSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelect(results[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="Search notes..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="search-results">
          {results.length > 0 ? (
            results.map((result, index) => (
              <button
                key={result.path}
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => onSelect(result.path)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="result-name">{getNoteName(result.name)}</span>
                <span className="result-path">{result.path}</span>
                {result.matches.length > 0 && (
                  <span className="result-match">
                    {result.matches[0].value.substring(0, 100)}
                  </span>
                )}
              </button>
            ))
          ) : query ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-text">No results found</div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-text">Start typing to search...</div>
            </div>
          )}
        </div>

        <div className="search-footer">
          <span><kbd>↑↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
