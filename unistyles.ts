import { StyleSheet } from 'react-native-unistyles'

const lightTheme = {
    colors: {
        // Brand colors
        primary: '#1a98ff',
        primaryLight: '#38c3ff99',
        tabInactive: '#cceeff',

        // Text colors
        text: {
            primary: '#0f172a',
            secondary: '#475569',
            light: '#ffffff',
            white: '#ffffff',
        },

        // Status colors
        status: {
            success: '#4ade80',
            error: '#ef4444',
            warning: '#f59e0b',
        },

        // Badge colors
        badge: {
            blue: {
                text: '#0369a1',
                background: '#bae6fd',
            },
            green: {
                text: '#15803d',
                background: '#bbf7d0',
            },
            gray: {
                text: '#475569',
                background: '#e2e8f0',
            },
            purple: {
                text: '#6b21a8',
                background: '#ddd6fe',
            },
            red: {
                text: '#b91c1c',
                background: '#fecaca',
            },
            orange: {
                text: '#c2410c',
                background: '#fed7aa',
            },
        },

        // Updated background colors
        background: {
            app: '#f8fafc', // Light gray background
            list: '#1a98ff', // Keep the primary blue for list (was working well)
            card: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white
        },

        // Add searchBar colors
        searchBar: {
            background: '#ffffff',
            text: '#475569',
            placeholder: '#94a3b8',
        },

        form: {
            input: {
                background: '#ffffff',
                border: '#e2e8f0',
                text: '#0f172a',
                placeholder: '#94a3b8',
            },
            label: '#475569',
        },

        // In both light and dark themes, add neutral colors
        actions: {
            error: '#ef4444', // Red
            warning: '#f59e0b', // Orange/Amber
            success: '#4ade80', // Green
            neutral: '#3b82f6', // Blue
        },

        volume: {
            item: {
                background: '#ffffff', // For light theme
                backgroundPressed: '#f5f5f5',
                separator: '#e2e8f0',
            },
            search: {
                background: '#f8fafc',
                input: '#ffffff',
                text: '#0f172a',
            },
        },
    },

    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        text: {
            textShadowColor: 'rgba(0, 0, 0, 0.1)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
        },
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
    },

    borderRadius: {
        xs: 4,
        sm: 6,
        md: 8,
        lg: 12,
        circle: (size: number) => size / 2,
    },

    typography: {
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
    },
} as const

const darkTheme = {
    colors: {
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
    },

    // Shadows adjusted for dark mode
    shadows: {
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
    },

    // These values stay the same in dark mode
    spacing: lightTheme.spacing,
    borderRadius: lightTheme.borderRadius,
    typography: lightTheme.typography,
} as const

const appThemes = {
    light: lightTheme,
    dark: darkTheme,
} as const

type AppThemes = typeof appThemes

const breakpoints = {
    xs: 0,
    sm: 400,
} as const

type AppBreakpoints = typeof breakpoints

declare module 'react-native-unistyles' {
    export interface UnistylesThemes extends AppThemes {}
    export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
    breakpoints,
    settings: {
        adaptiveThemes: true,
    },
    themes: appThemes,
})
