import React from 'react';

export default function StatusBadge({ status, type = 'default', className = '' }) {
  const getStyles = () => {
    switch (type.toLowerCase()) {
      case 'success':
      case 'active':
      case 'completed':
      case 'paid':
        return 'bg-success/10 text-success border border-success/20';
      case 'warning':
      case 'pending':
      case 'on_leave':
        return 'bg-warning/10 text-warning border border-warning/20';
      case 'danger':
      case 'inactive':
      case 'failed':
      case 'unpaid':
      case 'absent':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${getStyles()} ${className}`}>
      {status}
    </span>
  );
}
