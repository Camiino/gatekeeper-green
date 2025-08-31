import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { companiesApi } from '@/services/api';
import { ChevronDown } from 'lucide-react';

type Props = {
  value?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
};

export default function CompanyAutocomplete({ value = '', onChange, onBlur, error, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string; address?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!value || value.length < 1) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const results = await companiesApi.searchCompanies(value);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleSuggestionClick = (c: { id: string; name: string; address?: string }) => {
    onChange(c.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (suggestions.length > 0) setIsOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      onBlur?.();
    }, 200);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || 'Type company name...'}
        className={`hgm-input pr-8 ${error ? 'border-destructive' : ''}`}
        autoComplete="off"
      />
      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(c);
              }}
            >
              <div className="font-medium">{c.name}</div>
              {c.address && (
                <div className="text-sm text-muted-foreground">{c.address}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-md p-4 text-center text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  );
}

