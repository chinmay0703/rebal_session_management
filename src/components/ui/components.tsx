'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Loader2, X, AlertTriangle, ChevronDown, Check } from 'lucide-react';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-sm hover:shadow-md',
    secondary: 'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 focus:ring-brand-500',
    ghost: 'text-surface-600 hover:bg-surface-100 focus:ring-brand-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// Input
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-600">
          {label}
          {props.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-800',
          'placeholder:text-surface-400 transition-all duration-200',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none',
          error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// Select
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-600">
          {label}
          {props.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-800',
          'transition-all duration-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none',
          error && 'border-red-300',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Custom Dropdown Select
interface CustomSelectProps {
  label?: string;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ label, error, required, value, onChange, options, placeholder = 'Select...', className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const dropdownContent = open ? (
    <Portal>
      <div
        ref={dropdownRef}
        className="fixed bg-white rounded-xl border border-surface-200 shadow-xl overflow-hidden animate-slide-up"
        style={{ top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, animationDuration: '0.15s' }}
      >
        <div className="max-h-[240px] overflow-y-auto py-1">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-surface-400 text-center">No options available</p>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={cn(
                    'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors cursor-pointer',
                    isSelected ? 'bg-brand-50' : 'hover:bg-surface-50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', isSelected ? 'text-brand-700 font-medium' : 'text-surface-800')}>
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-xs text-surface-400 mt-0.5">{option.description}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </Portal>
  ) : null;

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-surface-600">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border bg-white text-left flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer',
          open ? 'border-brand-400 ring-2 ring-brand-100' : 'border-surface-200 hover:border-surface-300',
          error && 'border-red-300',
          className
        )}
      >
        <span className={cn('truncate text-sm', selected ? 'text-surface-800' : 'text-surface-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-surface-400 flex-shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {dropdownContent}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-surface-600">{label}</label>}
      <textarea
        className={cn(
          'w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-surface-800',
          'placeholder:text-surface-400 transition-all duration-200 resize-none outline-none',
          'focus:border-brand-400 focus:ring-2 focus:ring-brand-100',
          className
        )}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Card
export function Card({ children, className, hover, onClick }: {
  children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void;
}) {
  return (
    <div className={cn('bg-white rounded-2xl border border-surface-100 p-6 shadow-sm', hover && 'card-hover cursor-pointer', className)} onClick={onClick}>
      {children}
    </div>
  );
}

// Badge
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>
      {children}
    </span>
  );
}

// Modal
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className={cn(
          'relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full animate-slide-up',
          'max-h-[85vh] sm:max-h-[90vh] overflow-y-auto',
          sizes[size]
        )}>
          <div className="sticky top-0 bg-white rounded-t-2xl border-b border-surface-100 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg sm:text-xl font-semibold text-surface-800">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
              <X className="w-5 h-5 text-surface-500" />
            </button>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </Portal>
  );
}

// Progress Bar
export function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={cn('h-2.5 bg-surface-100 rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out progress-animate', {
          'bg-emerald-500': pct >= 80,
          'bg-blue-500': pct >= 50 && pct < 80,
          'bg-amber-500': pct >= 25 && pct < 50,
          'bg-red-400': pct < 25,
        })}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Skeleton
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-xl', className)} />;
}

// Empty State
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center px-4">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-surface-700 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-surface-400 mb-6 max-w-sm">{description}</p>
      {action}
    </div>
  );
}

// Confirm Dialog
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-surface-800 mb-1">{title}</h3>
                <p className="text-sm text-surface-500">{message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading} className="flex-1 sm:flex-none">Cancel</Button>
              <Button variant="danger" size="sm" onClick={onConfirm} loading={loading} className="flex-1 sm:flex-none">{confirmLabel}</Button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Search Input
export function SearchInput({ value, onChange, placeholder = 'Search...', className }: {
  value: string; onChange: (val: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-surface-200 bg-white text-sm sm:text-base',
          'placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-all',
          'shadow-sm focus:shadow-md'
        )}
      />
    </div>
  );
}
