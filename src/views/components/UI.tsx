import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, ...props }) => {
    return (
        <div className="mb-4">
            <label className="block text-sm font-semibold text-type-heading mb-1">
                {label}
            </label>
            <input
                className={`input-field ${error ? 'border-status-error focus:ring-status-error' : ''}`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
        </div>
    );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    loading,
    className = '',
    ...props
}) => {
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'bg-status-error text-white hover:bg-red-700 px-4 py-2 rounded-md shadow-tier-light',
    };

    return (
        <button
            className={`${variantClasses[variant]} flex items-center justify-center ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            ) : null}
            {children}
        </button>
    );
};

export const Card: React.FC<{ children: React.ReactNode; title?: string; className?: string }> = ({
    children,
    title,
    className = ''
}) => {
    return (
        <div className={`panel-card ${className}`}>
            {title && <h3 className="text-lg font-bold mb-4 border-b pb-2">{title}</h3>}
            {children}
        </div>
    );
};
