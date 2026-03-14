"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Shared dropdown list ───

interface DropdownListProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  filter: string;
  onFilterChange: (value: string) => void;
  options: string[];
  selectedValue?: string;
  showAdd: boolean;
  onSelect: (value: string) => void;
  emptyMessage: string;
  searchPlaceholder: string;
}

function DropdownList({
  inputRef,
  filter,
  onFilterChange,
  options,
  selectedValue,
  showAdd,
  onSelect,
  emptyMessage,
  searchPlaceholder,
}: DropdownListProps) {
  return (
    <>
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="input-cookbook w-full !border-b-0 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (showAdd) {
                onSelect(filter.trim());
              } else if (options.length > 0) {
                onSelect(options[0]);
              }
            }
          }}
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              "w-full text-left px-3 py-1.5 font-hand text-base rounded hover:bg-secondary transition-colors",
              selectedValue === option && "text-primary font-bold"
            )}
          >
            {option}
          </button>
        ))}
        {showAdd && (
          <button
            type="button"
            onClick={() => onSelect(filter.trim())}
            className="w-full text-left px-3 py-1.5 font-hand text-base text-primary rounded hover:bg-secondary transition-colors flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add &ldquo;{filter.trim()}&rdquo;
          </button>
        )}
        {options.length === 0 && !showAdd && (
          <p className="px-3 py-2 text-sm text-muted-foreground font-hand">
            {emptyMessage}
          </p>
        )}
      </div>
    </>
  );
}

function useDropdownFilter(open: boolean, inputRef: React.RefObject<HTMLInputElement | null>) {
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (open) {
      setFilter("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, inputRef]);

  return [filter, setFilter] as const;
}

function isNewValue(value: string, existing: string[]): boolean {
  const lower = value.trim().toLowerCase();
  return Boolean(value.trim()) && !existing.some((o) => o.toLowerCase() === lower);
}

// ─── Single-select combobox (Cuisine) ───

interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function ComboboxField({
  value,
  onChange,
  options,
  placeholder = "Select...",
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useDropdownFilter(open, inputRef);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(filter.toLowerCase())
  );
  const showAdd = isNewValue(filter, options);

  function select(val: string) {
    onChange(val);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "input-cookbook w-full mt-1 text-left flex items-center justify-between gap-2",
            !value && "text-muted-foreground opacity-60"
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="paper-card p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={4}
      >
        <DropdownList
          inputRef={inputRef}
          filter={filter}
          onFilterChange={setFilter}
          options={filtered}
          selectedValue={value}
          showAdd={showAdd}
          onSelect={select}
          emptyMessage="No matches"
          searchPlaceholder="Type to search..."
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-select combobox (Tags) ───

interface MultiComboboxFieldProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
}

export function MultiComboboxField({
  values,
  onChange,
  options,
  placeholder = "Add tags...",
}: MultiComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useDropdownFilter(open, inputRef);

  const available = options.filter(
    (o) =>
      !values.includes(o) &&
      o.toLowerCase().includes(filter.toLowerCase())
  );
  const showAdd = isNewValue(filter, options) && isNewValue(filter, values);

  function addTag(tag: string) {
    onChange([...values, tag]);
    setFilter("");
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
          {values.map((tag, i) => (
            <span
              key={tag}
              className="stamp-badge flex items-center gap-1"
              style={{
                transform: `rotate(${i % 2 === 0 ? "-2deg" : "1.5deg"})`,
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="input-cookbook w-full mt-1 text-left flex items-center justify-between gap-2 text-muted-foreground opacity-60"
          >
            <span>{placeholder}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="paper-card p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          sideOffset={4}
        >
          <DropdownList
            inputRef={inputRef}
            filter={filter}
            onFilterChange={setFilter}
            options={available}
            showAdd={showAdd}
            onSelect={addTag}
            emptyMessage={values.length === options.length ? "All tags selected" : "No matches"}
            searchPlaceholder="Type to search or add..."
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
