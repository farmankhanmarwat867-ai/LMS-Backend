import React from 'react';

export default function DashboardCard({ children, className = '', title, action }) {
  return (
    <div className={`bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-lg">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
