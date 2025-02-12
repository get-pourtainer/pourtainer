const { AndroidConfig, withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')
const withSourceFiles = require('./withSourceFiles')

const withModifiedAppBuildGradle = (config, opts) => withAppBuildGradle(config, config => {
    const gradleDependencies = `
    implementation("androidx.glance:glance:${opts.glanceVersion}")
    implementation("androidx.glance:glance-appwidget:${opts.glanceVersion}")
    `

    const gradleAndroidConfig = `
android {
    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "${opts.kotlinExtensionVersion}"
    }
}
`

    let newFileContents = config.modResults.contents

    newFileContents = mergeContents({
        src: newFileContents,
        newSrc: gradleDependencies,
        tag: 'GlanceDependencies',
        anchor: /implementation\("com.facebook.react:react-android"\)/,
        offset: 1,
        comment: '//'
    }).contents

    newFileContents = mergeContents({
        src: newFileContents,
        newSrc: gradleAndroidConfig,
        tag: 'GlanceAndroidConfig',
        anchor: /dependencies \{/,
        offset: -1,
        comment: '//'
    }).contents

    config.modResults.contents = newFileContents

    return config
})

const withModifiedAndroidManifest = (config, opts) => withAndroidManifest(config, config => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults)
    mainApplication.receiver = {
        $: {
            "android:name": `.${opts.receiverName}`,
            "android:exported": 'false'
        },
        "intent-filter": [
            {
                action: [
                    {
                        $: {
                            "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
                        },
                    },
                ],
            },
        ],
        "meta-data": [
            {
                $: {
                    "android:name": "android.appwidget.provider",
                    "android:resource": "@xml/pourtainer_widget_info",
                },
            },
        ],
    }

    return config
})

const withAndroidWidget = (config, opts) => {
    config = withModifiedAppBuildGradle(config, opts)
    config = withModifiedAndroidManifest(config, opts)
    config = withSourceFiles(config, { src: opts.src })

    return config
}

module.exports = withAndroidWidget
