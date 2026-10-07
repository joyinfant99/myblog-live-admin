import type { Config } from 'tailwindcss';
const c = (v: string) => `rgb(var(--${v}-rgb) / <alpha-value>)`;
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), surface2: c('surface-2'), side: c('side'),
        fg: c('fg'), body: 'var(--body)', muted: c('muted'), line: 'var(--line)',
        accent: c('accent'), danger: c('danger'), success: c('success'),
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        read: ['var(--font-read)', 'Georgia', 'serif'],
        phrase: ['var(--font-phrase)', 'serif'],
        latin: ['var(--font-latin)', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { DEFAULT: '6px' },
      boxShadow: { pop: '0 8px 30px rgb(0 0 0 / 0.14), 0 0 0 1px var(--line)' },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pop: { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { opacity: '0.5' }, '50%': { opacity: '1' }, '100%': { opacity: '0.5' } },
      },
      animation: { rise: 'rise .45s cubic-bezier(0.22,1,0.36,1) both', pop: 'pop .14s ease-out both', shimmer: 'shimmer 1.6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
export default config;
