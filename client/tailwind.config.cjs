/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pregular: ['Poppins-Regular', 'sans-serif'],
        pmedium: ['Poppins-SemiBold', 'serif'],
        pbold: ['Poppins-Bold', 'serif'],
      },
      colors: {
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        wonoGreen : "#80bf01",
        borderGray: '#d1d5db',
        successGreen : "#BAE4C9",
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        'primary-foreground': 'var(--primary-foreground)',
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        'accent-foreground': 'var(--accent-foreground)',
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground, #ffffff)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
      },
      fontSize: {
        title: '1.5rem', // Equivalent to text-2xl
        subtitle: '1.125rem', // Equivalent to text-lg
        widgetTitle: '1.3rem',
        mobileTitle: '1rem',
        content: '0.875rem', // Equivalent to text-sm
        small: '0.7rem',
      },
      borderWidth: {
        default: '2px',
      },
      boxShadow: {
        md: '0 1px 4px 2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', // Updated shadow-md
      },
    },
  },
  plugins: [require("tailwindcss-motion")],
};
