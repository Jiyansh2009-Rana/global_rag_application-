import { forwardRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, rightElement, className = '', id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5 font-['Open_Sans']">
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9D9FA2', display: 'block' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={ref}
            id={inputId}
            className={className}
            style={{
              width: '100%',
              padding: rightElement ? '10px 44px 10px 14px' : '10px 14px',
              borderRadius: 10,
              background: '#1A1A1B',
              border: `1px solid ${error ? '#dc3545' : 'rgba(255, 255, 255, 0.12)'}`,
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 150ms ease, box-shadow 150ms ease, background-color 150ms ease',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.24)',
              ...style,
            }}
            onFocus={e => {
              if (!error) {
                e.currentTarget.style.borderColor = '#00C2DE';
                e.currentTarget.style.boxShadow = '0 0 0 0.25rem rgba(0, 194, 222, 0.25)';
              }
              props.onFocus?.(e);
            }}
            onBlur={e => {
              if (!error) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.24)';
              }
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightElement && (
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p style={{ fontSize: '0.75rem', color: '#dc3545', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <AlertCircle size={13} className="shrink-0 text-[#dc3545]" />
            <span>{error}</span>
          </p>
        )}
        {hint && !error && (
          <p style={{ fontSize: '0.75rem', color: '#6C757D', marginTop: 2 }}>{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* ── Password Input with Toggle Eye Visibility ── */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightElement'>>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleButton = (
      <button
        type="button"
        onClick={() => setShowPassword(prev => !prev)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 6,
          margin: 0,
          cursor: 'pointer',
          color: showPassword ? '#00C2DE' : '#6C757D',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 140ms ease, transform 100ms ease',
        }}
        onMouseEnter={e => {
          if (!showPassword) e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={e => {
          if (!showPassword) e.currentTarget.style.color = '#6C757D';
        }}
        onMouseDown={e => {
          e.currentTarget.style.transform = 'scale(0.92)';
        }}
        onMouseUp={e => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          /* Eye Off Icon */
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        ) : (
          /* Eye Open Icon */
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    );

    return (
      <Input
        ref={ref}
        id={id}
        label={label}
        error={error}
        hint={hint}
        type={showPassword ? 'text' : 'password'}
        rightElement={toggleButton}
        className={className}
        {...props}
      />
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

/* ── Textarea ── */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', id, style, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5 font-['Open_Sans']">
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9D9FA2', display: 'block' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={className}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            resize: 'vertical',
            background: '#1A1A1B',
            border: `1px solid ${error ? '#dc3545' : 'rgba(255, 255, 255, 0.12)'}`,
            color: '#FFFFFF',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.24)',
            lineHeight: 1.5,
            ...style,
          }}
          onFocus={e => {
            if (!error) {
              e.currentTarget.style.borderColor = '#00C2DE';
              e.currentTarget.style.boxShadow = '0 0 0 0.25rem rgba(0, 194, 222, 0.25)';
            }
          }}
          onBlur={e => {
            if (!error) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.24)';
            }
          }}
          {...props}
        />
        {error && (
          <p style={{ fontSize: '0.75rem', color: '#dc3545', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <AlertCircle size={13} className="shrink-0 text-[#dc3545]" />
            <span>{error}</span>
          </p>
        )}
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
      <div className="flex flex-col gap-1.5 font-['Open_Sans']">
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#9D9FA2', display: 'block' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={className}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 10,
            cursor: 'pointer',
            background: '#1A1A1B',
            border: `1px solid ${error ? '#dc3545' : 'rgba(255, 255, 255, 0.12)'}`,
            color: '#FFFFFF',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.24)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#00C2DE';
            e.currentTarget.style.boxShadow = '0 0 0 0.25rem rgba(0, 194, 222, 0.25)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? '#dc3545' : 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.24)';
          }}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p style={{ fontSize: '0.75rem', color: '#dc3545', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <AlertCircle size={13} className="shrink-0 text-[#dc3545]" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
