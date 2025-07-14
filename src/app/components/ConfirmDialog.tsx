import React, { FC, useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel"
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl border border-white/20 dark:border-gray-700/50 shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 p-6 pt-2">
          <button
            onClick={onCancel}
            className="group relative flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-300/50 dark:border-gray-600/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-lg"></div>
            <span className="relative">{cancelText}</span>
          </button>
          <button
            onClick={onConfirm}
            className="group relative flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500/90 backdrop-blur-sm border border-red-400/50 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-red-600/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-lg"></div>
            <span className="relative">{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};