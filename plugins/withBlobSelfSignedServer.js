const { withMainApplication } = require('@expo/config-plugins')
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode')

const withBlobSelfSignedServer = config => withMainApplication(config, config => {
    const mainApplication = config.modResults.contents
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

    config.modResults.contents = mergeContents({
        src: mainApplication,
        newSrc: importContents,
        anchor: /import android.app.Application/,
        offset: 1,
        comment: '//'
    }).contents

    config.modResults.contents = mergeContents({
        src: mainApplication,
        newSrc: trustManagerContents,
        anchor: /ApplicationLifecycleDispatcher.onApplicationCreate\(this\)/,
        offset: 1,
        comment: '//'
    }).contents

    return config
})

module.exports = withBlobSelfSignedServer
