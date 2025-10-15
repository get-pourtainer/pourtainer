/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
    type: 'widget',
    icon: './icon.png',
    entitlements: {
        'com.apple.security.application-groups':
            config.ios.entitlements['com.apple.security.application-groups'],
    },
    colors: {
        $success: '#4ade80',
        $error: '#ef4444',
        $warning: '#f59e0b',
        // dark/light colors are handled from Xcode
    },
})
