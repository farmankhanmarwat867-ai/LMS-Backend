import React from 'react';

export default function Loader({ className = '', size = 'md' }) {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`animate-spin rounded-full border-t-primary border-slate-200 dark:border-slate-800 ${sizes[size]}`} />
    </div>
  );
}
