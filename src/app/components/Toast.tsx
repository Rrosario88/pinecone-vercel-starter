import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ 
  id, 
  message, 
  type, 
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fade in
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle size={20} className="text-green-500" />;
      case 'error': return <AlertCircle size={20} className="text-red-500" />;
      case 'warning': return <AlertCircle size={20} className="text-yellow-500" />;
      case 'info': return <Info size={20} className="text-blue-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success': return 'border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-900/20';
      case 'error': return 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20';
      case 'warning': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/80 dark:bg-yellow-900/20';
      case 'info': return 'border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/20';
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-[100] max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className={`
          ${getColors()}
          backdrop-blur-lg border rounded-xl shadow-lg
          p-4 flex items-start gap-3
          glass-effect
        `}
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
            {message}
          </p>
        </div>
        
        <button
          onClick={handleClose}
          className="group relative flex-shrink-0 p-1 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-red-500/20 opacity-0 group-hover:opacity-70 transition-opacity duration-300 blur-md rounded-lg"></div>
          <X size={16} className="relative" />
        </button>
      </div>
    </div>
  );
};

export interface ToastContextType {
  showToast: (message: string, type: ToastProps['type'], duration?: number) => void;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (message: string, type: ToastProps['type'], duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastProps = {
      id,
      message,
      type,
      duration,
      onClose: removeToast,
    };
    
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-0 right-0 z-[100] pointer-events-none">
      <div className="flex flex-col gap-2 p-4">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </div>
  );

  return { showToast, ToastContainer };
};