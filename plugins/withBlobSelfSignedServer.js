// required on android for `https` connections with self signed certificates (selfhosted portainer)

const { withMainApplication } = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')

const withBlobSelfSignedServer = (config) =>
    withMainApplication(config, (config) => {
        const importContents = `
import com.ReactNativeBlobUtil.ReactNativeBlobUtilUtils;
import javax.net.ssl.X509TrustManager;
    `
        const trustManagerContents = `
ReactNativeBlobUtilUtils.sharedTrustManager = object : X509TrustManager {
    override fun checkClientTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}

    override fun checkServerTrusted(chain: Array<java.security.cert.X509Certificate>, authType: String) {}

    override fun getAcceptedIssuers(): Array<java.security.cert.X509Certificate> {
        return arrayOf()
    }
};
    `

        let newFileContents = config.modResults.contents

        newFileContents = mergeContents({
            src: newFileContents,
            newSrc: importContents,
            tag: 'ReactNativeBlobUtilUtilsImports',
            anchor: /package com.pourtainer.mobile/,
            offset: 1,
            comment: '//',
        }).contents

        newFileContents = mergeContents({
            src: newFileContents,
            newSrc: trustManagerContents,
            tag: 'ReactNativeBlobUtilUtils',
            anchor: /ApplicationLifecycleDispatcher.onApplicationCreate\(this\)/,
            offset: 1,
            comment: '//',
        }).contents

        config.modResults.contents = newFileContents

        return config
    })

module.exports = withBlobSelfSignedServer
