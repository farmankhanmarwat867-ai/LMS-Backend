import React from 'react';

const Select = React.forwardRef(({
  label,
  options = [],
  error,
  placeholder = 'Select option',
  className = '',
  id,
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        id={id}
        ref={ref}
        className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all ${
          error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''
        }`}
        {...props}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-500 font-medium">
          {error.message || error}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
