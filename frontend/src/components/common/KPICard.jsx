import React from 'react';
import { motion } from 'framer-motion';

export default function KPICard({ title, value, icon: Icon, trend, trendValue, subtitle, className = '' }) {
  const isPositive = trend === 'up';
  const isNegative = trend === 'down';
  const isNeutral = trend === 'neutral';

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      className={`bg-card text-card-foreground rounded-2xl shadow-sm border border-border p-6 relative overflow-hidden group ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold font-heading">{value}</h3>
          
          {(trendValue || subtitle) && (
            <div className="mt-3 flex items-center text-sm">
              {trendValue && (
                <span className={`font-medium flex items-center mr-2 ${isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-muted-foreground'}`}>
                  {isPositive && '↑ '}
                  {isNegative && '↓ '}
                  {isNeutral && '→ '}
                  {trendValue}
                </span>
              )}
              {subtitle && <span className="text-muted-foreground">{subtitle}</span>}
            </div>
          )}
        </div>
        
        {Icon && (
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Icon size={24} className="stroke-2" />
          </div>
        )}
      </div>
      
      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500/20 to-pink-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}
