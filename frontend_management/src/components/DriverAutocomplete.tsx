import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { driversApi } from '@/services/api';
import { Driver } from '@/types';
import { ChevronDown } from 'lucide-react';

interface DriverAutocompleteProps {
  value: string;
  onChange: (name: string, phone?: string) => void;
  onBlur?: () => void;
  error?: string;
}

export default function DriverAutocomplete({ 
  value, 
  onChange, 
  onBlur,
  error 
}: DriverAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Driver[]>([]);
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
        const results = await driversApi.searchDrivers(value);
        setSuggestions(results);
      } catch (error) {
        console.error('Error fetching driver suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(timeoutId);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSuggestionClick = (driver: Driver) => {
    onChange(driver.name, driver.phone);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay to allow suggestion clicks to register
    setTimeout(() => {
      setIsOpen(false);
      onBlur?.();
    }, 200);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label htmlFor="driver-name">Driver Name *</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id="driver-name"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Type driver name..."
          className={`hgm-input pr-8 ${error ? 'border-destructive' : ''}`}
          autoComplete="off"
        />
        <ChevronDown 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" 
        />
        
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
            {suggestions.map((driver) => (
              <button
                key={driver.id}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none border-b border-border last:border-b-0"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur from firing before click
                  handleSuggestionClick(driver);
                }}
              >
                <div className="font-medium">{driver.name}</div>
                {driver.phone && (
                  <div className="text-sm text-muted-foreground">{driver.phone}</div>
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
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}