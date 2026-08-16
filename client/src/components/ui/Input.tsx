import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--muted)', display: 'block' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={className}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 10,
            background: 'var(--input-bg)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            color: 'var(--text)',
            fontSize: '0.88rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--input-shadow)',
          }}
          onFocus={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'rgba(45,212,191,0.45)';
              e.currentTarget.style.boxShadow = 'var(--input-focus-ring)';
              e.currentTarget.style.background = 'var(--accent-glow)';
            }
          }}
          onBlur={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'var(--input-shadow)';
              e.currentTarget.style.background = 'var(--input-bg)';
            }
          }}
          {...props}
        />
        {error && (
          <p style={{ fontSize: '0.72rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span>⚠</span> {error}
          </p>
        )}
        {hint && !error && (
          <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* ── Textarea ── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--muted)', display: 'block' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={className}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, resize: 'vertical',
            background: 'var(--input-bg)', backdropFilter: 'blur(12px)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit',
            outline: 'none', transition: 'all 0.2s ease',
            boxShadow: 'var(--input-shadow)', lineHeight: 1.6,
            ...style,
          }}
          onFocus={e => {
            if (!error) { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.45)'; e.currentTarget.style.boxShadow = 'var(--input-focus-ring)'; }
          }}
          onBlur={e => {
            if (!error) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--input-shadow)'; }
          }}
          {...props}
        />
        {error && <p style={{ fontSize: '0.72rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><span>⚠</span> {error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

/* ── Select ── */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--muted)', display: 'block' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={className}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
            background: 'var(--input-bg)', backdropFilter: 'blur(12px)',
            border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
            color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'inherit',
            outline: 'none', transition: 'all 0.2s ease',
            boxShadow: 'var(--input-shadow)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.45)'; e.currentTarget.style.boxShadow = 'var(--input-focus-ring)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--input-shadow)'; }}
          {...props}
        >
          {children}
        </select>
        {error && <p style={{ fontSize: '0.72rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><span>⚠</span> {error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
