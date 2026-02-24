export const COLORS = {
    bgApp: '#141414', // --ui-gray-true-11: #141414;
    bgSecondary: '#26272b', // --ui-gray-iron-10: #26272b;

    text: '#fcfcfd', // --ui-gray-1: #fcfcfd;
    textMuted: '#98a2b3', // --ui-gray-6: #98a2b3;

    hr: '#232323', // #232323;
    hrMuted: '#191a1d', // #191a1d
    hrPrimary: '#194973', // #194973

    primary: '#2d8ce1', // #2d8ce1
    primaryDark: '#194973', // #194973
    primaryLight: '#36c5ff', // #36c5ff
    // #33a3ff

    success: '#4ade80', // #4ade80
    successDark: '#14532d', // #14532d
    successLight: '#2ce27e', // #2ce27e

    error: '#b91c1c', // #b91c1c
    errorDark: '#7f1d1d', // #7f1d1d
    errorLight: '#ff8385', // #ff8385
    // #fca5a5

    warning: '#e86925', // #e86925
    warningDark: '#673014', // #673014
    warningLight: '#ff7c30', // #ff7c30

    purple: '#6426c9', // #6426c9
    purpleDark: '#381671', // #381671
    purpleLight: '#c4b5fd', // #c4b5fd

    white: 'rgb(255, 255, 255)',
    black: 'rgb(0, 0, 0)',

    whiteWithOpacity: (opacity: number) => `rgba(255, 255, 255, ${opacity})`,
    blackWithOpacity: (opacity: number) => `rgba(0, 0, 0, ${opacity})`,

    terminalGreen: '#00ff00',

    // primary: 'rgb(0, 145, 226)', // '#0091e2',
    // primaryLight: 'rgb(12, 165, 236)', // '#0ca5ec',
    // primaryLighter: 'rgb(26, 152, 255)', //'#1a98ff',
    // primaryDark: 'rgb(6, 89, 134)',
    // primaryDarker: 'rgb(28, 41, 57)',

    // primary: 'rgb(0, 145, 226)', // '#0091e2',
    // primaryLight: 'rgb(26, 152, 255)', //'#1a98ff',
    // primaryDark: 'rgb(6, 89, 134)',
    // primaryDarker: 'rgb(28, 41, 57)',

    // hr: 'rgb(56, 56, 56)',
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
