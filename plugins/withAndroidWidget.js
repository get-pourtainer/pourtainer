const {
    AndroidConfig,
    withAppBuildGradle,
    withAndroidManifest,
    withProjectBuildGradle,
} = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')
const fs = require('node:fs')
const path = require('node:path')
const withAndroidSourceFiles = require('./withAndroidSourceFiles')

// The Compose compiler Gradle plugin must match the Kotlin Gradle plugin version,
// which React Native pins in its version catalog.
const getKotlinVersion = (projectRoot) => {
    const catalogPath = path.join(
        projectRoot,
        'node_modules/react-native/gradle/libs.versions.toml'
    )
    const match = fs.readFileSync(catalogPath, 'utf8').match(/^kotlin\s*=\s*"([^"]+)"/m)
    if (!match) {
        throw new Error(`withAndroidWidget: could not read the Kotlin version from ${catalogPath}`)
    }
    return match[1]
}

const withModifiedAppBuildGradle = (config, opts) =>
    // implementation("androidx.glance:glance:${opts.versions.glance}")
    withAppBuildGradle(config, (config) => {
        const gradleDependencies = `
implementation("androidx.glance:glance-appwidget:${opts.versions.glance}")
implementation("androidx.glance:glance-preview:${opts.versions.glance}")
implementation("androidx.glance:glance-material3:${opts.versions.glance}")
implementation("androidx.glance:glance-appwidget-preview:${opts.versions.glance}")
implementation("com.google.code.gson:gson:${opts.versions.gson}")
implementation("androidx.activity:activity-compose:${opts.versions.activityCompose}")
implementation("androidx.compose.ui:ui:${opts.versions.composeUi}")
implementation("androidx.compose.material3:material3:${opts.versions.material3}")
implementation("androidx.work:work-runtime:${opts.versions.workRuntime}")
`

        const gradleAndroidConfig = `
android {
    buildFeatures {
        compose = true
    }
}
`
        // composeOptions {
        // 	kotlinCompilerExtensionVersion = "${opts.versions.kotlinExtension}"
        // }

        let newFileContents = config.modResults.contents

        // Apply Kotlin Compose Gradle plugin (required for Kotlin 2.0+ when compose is enabled)
        newFileContents = mergeContents({
            src: newFileContents,
            newSrc: 'apply plugin: "org.jetbrains.kotlin.plugin.compose"',
            tag: 'KotlinComposeGradlePlugin',
            anchor: /apply plugin: "org.jetbrains.kotlin.android"/,
            offset: 1,
            comment: '//',
        }).contents

        newFileContents = mergeContents({
            src: newFileContents,
            newSrc: gradleDependencies,
            tag: 'GlanceDependencies',
            anchor: /implementation\("com.facebook.react:react-android"\)/,
            offset: 1,
            comment: '//',
        }).contents

        newFileContents = mergeContents({
            src: newFileContents,
            newSrc: gradleAndroidConfig,
            tag: 'GlanceAndroidConfig',
            anchor: /dependencies \{/,
            offset: -1,
            comment: '//',
        }).contents

        config.modResults.contents = newFileContents

        return config
    })

const withRootKotlinComposeClasspath = (config, opts) =>
    withProjectBuildGradle(config, (config) => {
        let newFileContents = config.modResults.contents

        const kotlinVersion = getKotlinVersion(config.modRequest.projectRoot)

        // Ensure the Kotlin Compose Gradle plugin is available on the buildscript classpath
        newFileContents = mergeContents({
            src: newFileContents,
            newSrc: `    classpath('org.jetbrains.kotlin:compose-compiler-gradle-plugin:${kotlinVersion}')`,
            tag: 'KotlinComposeGradlePluginClasspath',
            anchor: /classpath\('org\.jetbrains\.kotlin:kotlin-gradle-plugin'\)/,
            offset: 1,
            comment: '//',
        }).contents

        config.modResults.contents = newFileContents

        return config
    })

const withModifiedAndroidManifest = (config, opts) =>
    withAndroidManifest(config, (config) => {
        const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults)
        const receiverName = `.${opts.receiverName}`
        const activityName = '.PourtainerAppWidgetConfigurationActivity'
        const widgetReceiver = {
            $: {
                'android:name': `.${opts.receiverName}`,
                'android:exported': 'true',
                'android:label': '@string/app_name',
            },
            'intent-filter': [
                {
                    action: [
                        {
                            $: {
                                'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                            },
                        },
                    ],
                },
                {
                    action: [
                        {
                            $: {
                                'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE',
                            },
                        },
                    ],
                },
            ],
            'meta-data': [
                {
                    $: {
                        'android:name': 'android.appwidget.provider',
                        'android:resource': '@xml/pourtainer_widget_info',
                        'android:description': '@string/widget_description',
                    },
                },
            ],
        }
        // Append instead of assign: other plugins may register receivers too, and
        // re-running prebuild without --clean must not duplicate entries
        mainApplication.receiver = [
            ...(mainApplication.receiver ?? []).filter((r) => r.$['android:name'] !== receiverName),
            widgetReceiver,
        ]
        mainApplication.activity = (mainApplication.activity ?? []).filter(
            (a) => a.$['android:name'] !== activityName
        )
        mainApplication.activity.push({
            $: {
                'android:name': activityName,
                'android:exported': 'true',
            },
            'intent-filter': [
                {
                    action: [
                        {
                            $: {
                                'android:name': 'android.appwidget.action.APPWIDGET_CONFIGURE',
                            },
                        },
                    ],
                },
            ],
        })

        return config
    })

const withAndroidWidget = (config, opts) => {
    config = withRootKotlinComposeClasspath(config, opts)
    config = withModifiedAppBuildGradle(config, opts)
    config = withModifiedAndroidManifest(config, opts)
    // Kotlin sources are written against this package and rewritten to android.package
    config = withAndroidSourceFiles(config, { src: opts.src, distPlaceholder: 'com.pourtainer.mobile' })

    return config
}

module.exports = withAndroidWidget
