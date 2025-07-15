export const COLORS = {
    // Brand colors
    primary: '#1a98ff',
    primaryLight: '#38c3ff99',
    tabInactive: '#cceeff',

    // Text colors
    text: {
        primary: '#f8fafc',
        secondary: '#dadde0',
        light: '#94a3b8',
        white: '#ffffff',
    },

    // Status colors - keeping these the same for consistency
    status: {
        success: '#4ade80',
        error: '#ef4444',
        warning: '#f59e0b',
    },

    // Badge colors - darker versions
    badge: {
        blue: {
            text: '#7dd3fc',
            background: '#0c4a6e',
        },
        green: {
            text: '#86efac',
            background: '#14532d',
        },
        gray: {
            text: '#cbd5e1',
            background: '#334155',
        },
        purple: {
            text: '#c4b5fd',
            background: '#4c1d95',
        },
        red: {
            text: '#fca5a5',
            background: '#7f1d1d',
        },
        orange: {
            text: '#fdba74',
            background: '#7c2d12',
        },
    },

    // Dark mode background colors
    background: {
        app: '#0f172a', // Dark slate
        list: '#0f172a', // Dark slate background
        card: '#1a98ff', // Use primary blue for cards in dark mode
    },

    // Add searchBar colors for dark mode
    searchBar: {
        background: '#1e293b',
        text: '#f8fafc',
        placeholder: '#64748b',
    },

    form: {
        input: {
            background: '#1e293b',
            border: '#334155',
            text: '#f8fafc',
            placeholder: '#64748b',
        },
        label: '#cbd5e1',
    },

    // In both light and dark themes, add neutral colors
    actions: {
        error: '#fca5a5', // Lighter red for better contrast on blue
        warning: '#fcd34d', // Lighter amber for better contrast
        success: '#86efac', // Lighter green for better contrast
        neutral: '#ffffff', // White for maximum contrast against blue
    },

    volume: {
        item: {
            background: '#1e293b', // Darker blue-gray
            backgroundPressed: '#334155',
            separator: '#334155',
        },
        search: {
            background: '#1e293b',
            input: '#0f172a',
            text: '#f8fafc',
        },
    },
} as const

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    text: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
} as const

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
} as const

export const TYPOGRAPHY = {
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    body: {
        fontSize: 15,
        fontWeight: '400',
    },
    small: {
        fontSize: 12,
        fontWeight: '400',
    },
} as const

export const BORDER_RADIUS = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    circle: (size: number) => size / 2,
} as const
