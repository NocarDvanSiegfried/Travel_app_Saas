import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};