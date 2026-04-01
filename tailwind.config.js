export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    base: '#3B82F6', // More vibrant Blue
                    dark: '#1D4ED8',
                    light: '#EFF6FF',
                },
                secondary: {
                    base: '#10B981',
                    dark: '#047857',
                    light: '#ECFDF5',
                },
                accent: {
                    purple: '#8B5CF6',
                    indigo: '#6366F1',
                    rose: '#F43F5E',
                },
                status: {
                    success: '#10B981',
                    error: '#EF4444',
                    warning: '#F59E0B',
                    info: '#3B82F6',
                },
                appBg: '#F8FAFC', // Slate 50
                cardBg: 'rgba(255, 255, 255, 0.95)',
                borderColor: '#F1F5F9', // Slate 100
                type: {
                    heading: '#0F172A', // Slate 900
                    body: '#475569', // Slate 600
                    contrast: '#1E293B', // Slate 800
                }
            },
            boxShadow: {
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
                'tier-light': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.06)',
                'tier-medium': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'tier-dark': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                'premium': '0 0 50px rgba(0, 0, 0, 0.03), 0 10px 30px rgba(0, 0, 0, 0.05)',
            },
            fontFamily: {
                sans: ['Inter', 'Outfit', 'Roboto', 'system-ui', 'sans-serif'],
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    '0%, 100%': { opacity: 0.8, filter: 'brightness(1)' },
                    '50%': { opacity: 1, filter: 'brightness(1.2)' },
                }
            }
        },
    },
    plugins: [],
}
