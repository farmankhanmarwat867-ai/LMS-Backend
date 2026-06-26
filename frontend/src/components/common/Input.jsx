import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const Input = React.forwardRef(({
  label,
  type = 'text',
  error,
  className = '',
  id,
  required = false,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <div className="relative w-full">
        <input
          id={id}
          type={inputType}
          ref={ref}
          className={`w-full px-4 py-2.5 text-sm rounded-xl border bg-background text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm ${
            isPassword ? 'pr-11' : ''
          } ${
            error ? 'border-destructive focus:ring-destructive/20 focus:border-destructive' : 'border-border'
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-hidden"
          >
            {showPassword ? (
              <EyeOff className="w-4.5 h-4.5" />
            ) : (
               <Eye className="w-4.5 h-4.5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <motion.span 
          initial={{ opacity: 0, y: -5 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="text-xs text-destructive font-medium"
        >
          {error.message || error}
        </motion.span>
      )}
    </div>
  );
});

import { motion } from 'framer-motion';

Input.displayName = 'Input';

export default Input;
