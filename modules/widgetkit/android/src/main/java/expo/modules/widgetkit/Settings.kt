package expo.modules.widgetkit

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class Connection: Record {
    @Field
    var url: String? = null

    @Field
    var accessToken: String? = null

    @Field
    var id: String? = null
}
