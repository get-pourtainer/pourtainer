/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
    type: 'widget',
    icon: './icon.png',
    entitlements: {},
    colors: {
        $background_light: "#f8fafc",
        $background_dark: "#0f172a",
        $text_light: '#dadde0',
        $text_dark: '#475569',
        $success: '#4ade80',
        $error: '#ef4444',
        $warning: '#f59e0b',
    }
})
