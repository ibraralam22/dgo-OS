'use client';

import { useEffect, useRef, useState } from 'react';

import { Input } from '@components/ui/input';

import { cn } from '@lib/utils';
import { useLoadScript } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = ['places'];

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string; // Additional classes for the container or input
}

interface SuggestionItem {
  id: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
  placeId?: string;
}

function LocationAutocompleteInput({
  value,
  onChange,
  placeholder = 'Search location...',
  className,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const requestIdRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal input value when external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const normalizeSuggestions = (items: Array<Record<string, unknown>>): SuggestionItem[] => {
    const normalized: SuggestionItem[] = [];

    items.forEach((item, index) => {
      const prediction =
        (item as { placePrediction?: Record<string, unknown>; queryPrediction?: Record<string, unknown> })
          .placePrediction ??
        (item as { queryPrediction?: Record<string, unknown> }).queryPrediction ??
        item;
      const textValue =
        (prediction as { text?: { text?: string } }).text?.text ??
        (prediction as { text?: string }).text ??
        (prediction as { description?: string }).description ??
        '';
      const primaryText =
        typeof textValue === 'string' ? textValue : ((textValue as { text?: string } | undefined)?.text ?? '');
      const secondaryText =
        (prediction as { secondaryText?: { text?: string } }).secondaryText?.text ??
        (prediction as { secondaryText?: string }).secondaryText ??
        undefined;
      const placeId = (prediction as { placeId?: string }).placeId ?? (prediction as { place_id?: string }).place_id;
      const fullText =
        (prediction as { text?: { text?: string } }).text?.text ??
        (prediction as { description?: string }).description ??
        primaryText;

      if (!fullText) {
        return;
      }

      normalized.push({
        id: placeId ?? `${index}-${fullText}`,
        primaryText,
        secondaryText,
        fullText,
        placeId,
      });
    });

    return normalized;
  };

  const fetchSuggestions = (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setIsFetching(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      const googleMaps = (window as typeof window & { google?: any }).google;
      const autocomplete = googleMaps?.maps?.places?.AutocompleteSuggestion;

      if (!autocomplete?.fetchAutocompleteSuggestions) {
        if (requestIdRef.current === currentRequestId) {
          setSuggestions([]);
        }
        return;
      }

      setIsFetching(true);

      try {
        const response = await autocomplete.fetchAutocompleteSuggestions({
          input: query,
        });
        if (requestIdRef.current !== currentRequestId) {
          return;
        }
        const nextSuggestions = normalizeSuggestions(response?.suggestions ?? []);
        setSuggestions(nextSuggestions);
      } catch (error) {
        if (requestIdRef.current === currentRequestId) {
          setSuggestions([]);
        }
        console.error('Autocomplete error: ', error);
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsFetching(false);
        }
      }
    }, 300);
  };

  const handleSelect = (selection: SuggestionItem) => {
    setInputValue(selection.fullText);
    setSuggestions([]);
    onChange(selection.fullText);
    setShowSuggestions(false);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setInputValue(nextValue);
    setShowSuggestions(true);
    fetchSuggestions(nextValue);
  };

  return (
    <div className='relative w-full' ref={containerRef}>
      <div className='relative'>
        <MapPin className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          value={inputValue}
          onChange={handleInput}
          placeholder={placeholder}
          className={cn('pl-10', className)}
          onFocus={() => setShowSuggestions(true)}
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul className='absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-background py-1 shadow-md'>
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className='cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground'
            >
              <div className='text-sm'>{suggestion.primaryText}</div>
              {suggestion.secondaryText && (
                <div className='text-xs text-muted-foreground'>{suggestion.secondaryText}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      {showSuggestions && !suggestions.length && isFetching && (
        <div className='absolute z-50 mt-1 w-full rounded-md border border-input bg-background px-4 py-2 text-sm text-muted-foreground shadow-md'>
          Loading suggestions...
        </div>
      )}
    </div>
  );
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search location...',
  className,
}: LocationAutocompleteProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={cn('relative w-full', className)}>
        <Input
          disabled
          placeholder='Missing Map API Key'
          className='border-destructive bg-destructive/10 text-destructive placeholder:text-destructive/50'
        />
      </div>
    );
  }

  if (loadError) return <div className='text-sm text-red-500'>Error loading maps</div>;
  if (!isLoaded) return <Input disabled placeholder='Loading Maps...' className={className} />;

  return (
    <LocationAutocompleteInput value={value} onChange={onChange} placeholder={placeholder} className={className} />
  );
}
