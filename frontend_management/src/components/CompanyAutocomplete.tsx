import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { managementApi } from '@/services/api';

type Props = {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
};

export default function CompanyAutocomplete({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<{ id: number; name: string; address: string | null }[]>([]);

  useEffect(() => {
    managementApi.listCompanies().then(setCompanies).catch(() => setCompanies([]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies.slice(0, 50);
    return companies.filter(c => c.name.toLowerCase().includes(q)).slice(0, 50);
  }, [companies, query]);

  const display = value || '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {display || (placeholder || 'Select company')}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search company..." value={query} onValueChange={setQuery} />
          <CommandEmpty>No company found.</CommandEmpty>
          <CommandGroup>
            {filtered.map((c) => (
              <CommandItem key={c.id} onSelect={() => { onChange(c.name); setOpen(false); }}>
                <Check className={cn('mr-2 h-4 w-4', display === c.name ? 'opacity-100' : 'opacity-0')} />
                {c.name}
              </CommandItem>
            ))}
            {query && (
              <CommandItem key={`new-${query}`} onSelect={() => { onChange(query); setOpen(false); }}>
                Use "{query}" (new)
              </CommandItem>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

