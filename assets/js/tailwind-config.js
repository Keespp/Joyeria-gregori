tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
            colors: {
                // Oro refinado tipo champán (menos "latón" que el dorado puro).
                // El DEFAULT mantiene compatibilidad con las clases existentes (text-gold, bg-gold).
                gold: {
                    DEFAULT: '#C6A15B',
                    light: '#D9BE86',
                    dark: '#A67F3D',
                    deep: '#8A6A2F',
                    50: '#FBF6EC',
                    100: '#F4E9D2',
                },
                // Neutros cálidos: base marfil y negro cálido para las secciones dramáticas.
                ivory: '#FBFAF7',
                cream: '#F5F1E9',
                sand: '#EDE7DB',
                ink: '#141210',
                charcoal: '#1F1C18',
            },
            letterSpacing: {
                luxe: '0.28em',
                wide2: '0.18em',
            },
            boxShadow: {
                luxe: '0 24px 60px -24px rgba(20, 18, 16, 0.28)',
                'luxe-sm': '0 12px 32px -16px rgba(20, 18, 16, 0.22)',
                gold: '0 18px 40px -18px rgba(166, 127, 61, 0.55)',
            },
            keyframes: {
                'fade-up': {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                'ken-burns': {
                    '0%': { transform: 'scale(1)' },
                    '100%': { transform: 'scale(1.08)' },
                },
            },
            animation: {
                'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'fade-in': 'fade-in 0.6s ease-in-out forwards',
                shimmer: 'shimmer 2.2s linear infinite',
                'ken-burns': 'ken-burns 14s ease-out forwards',
            },
        }
    }
}
