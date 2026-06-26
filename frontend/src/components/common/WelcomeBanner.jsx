import React from 'react';
import { motion } from 'framer-motion';

export default function WelcomeBanner({ userName, role, children }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm mb-6"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 p-8 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-2">
            Good Morning, <span className="text-gradient">{userName}</span> 👋
          </h1>
          {role && (
            <p className="text-muted-foreground font-medium text-lg">
              {role.replace('_', ' ')}
            </p>
          )}
        </div>
        {children && (
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {children}
          </div>
        )}
      </div>
    </motion.div>
  );
}
