const { getSentryExpoConfig } = require('@sentry/react-native/metro')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)

config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'crypto') {
        // when importing crypto, resolve to react-native-quick-crypto
        return context.resolveRequest(context, 'react-native-quick-crypto', platform)
    }
    // otherwise chain to the standard Metro resolver.
    return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
