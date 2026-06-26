import React from 'react';
import { motion } from 'framer-motion';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const baseStyle = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed select-none';
  
  const variants = {
    primary: 'bg-primary hover:bg-violet-600 text-primary-foreground shadow-md shadow-primary/20',
    secondary: 'bg-secondary hover:bg-pink-600 text-secondary-foreground shadow-md shadow-secondary/20',
    outline: 'border border-border hover:bg-muted text-foreground dark:hover:bg-muted',
    danger: 'bg-destructive hover:bg-red-600 text-destructive-foreground shadow-md shadow-destructive/10',
    success: 'bg-success hover:bg-green-600 text-white shadow-md shadow-success/10',
    ghost: 'hover:bg-muted text-foreground dark:hover:bg-muted',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
    icon: 'p-2',
  };

  return (
    <motion.button
      whileHover={disabled || isLoading ? {} : { scale: 1.03 }}
      whileTap={disabled || isLoading ? {} : { scale: 0.98 }}
      type={type}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
