'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Option {
  label: string;
  value: string;
  subtitle?: string;
}

interface AutocompleteProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  showAllOption?: boolean;
  allLabel?: string;
}

export function Autocomplete({ options, value, onChange, placeholder = 'Search...', emptyMessage = 'No results', className, disabled, clearable, showAllOption, allLabel = 'All' }: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = React.useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || (o.subtitle && o.subtitle.toLowerCase().includes(q)));
  }, [options, search]);

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground', className)}
          >
            {selected ? <span className="truncate">{selected.label}</span> : placeholder}
            <span className="ml-2 flex items-center gap-1 shrink-0">
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </span>
          </Button>
        </PopoverTrigger>
        {clearable && value && (
          <button
            type="button"
            onPointerDown={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted z-10"
          >
            <X className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />
          </button>
        )}
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={placeholder}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="max-h-60 overflow-auto">
            {showAllOption && (
              <div
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                  !value && 'bg-accent'
                )}
              >
                <Check className={cn('h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                <span>{allLabel}</span>
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground',
                    option.value === value && 'bg-accent'
                  )}
                >
                  <Check className={cn('h-4 w-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{option.label}</span>
                    {option.subtitle && <span className="text-xs text-muted-foreground truncate">{option.subtitle}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
