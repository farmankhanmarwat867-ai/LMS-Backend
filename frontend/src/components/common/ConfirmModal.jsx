import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  isLoading = false,
}) {
  const variantStyles = {
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40',
      iconColor: 'text-red-600 dark:text-red-400',
      btnVariant: 'danger',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      btnVariant: 'primary',
    },
    primary: {
      bg: 'bg-primary/5 border border-primary/20',
      iconColor: 'text-primary',
      btnVariant: 'primary',
    },
  }[variant] || {
    bg: 'bg-primary/5 border border-primary/20',
    iconColor: 'text-primary',
    btnVariant: 'primary',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className={`flex items-start gap-3 rounded-xl p-4 ${variantStyles.bg}`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${variantStyles.iconColor}`} />
          <div className="text-sm font-medium text-slate-750 dark:text-slate-300">
            {typeof message === 'string' ? (
              <p>{message}</p>
            ) : (
              message
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose} variant="outline">{cancelText}</Button>
          <Button onClick={onConfirm} variant={variantStyles.btnVariant} isLoading={isLoading}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
