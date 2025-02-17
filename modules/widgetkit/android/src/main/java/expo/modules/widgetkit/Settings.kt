package expo.modules.widgetkit

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class ContainerSetting : Record {
    @Field
    var name: String = ""

    @Field
    var id: String = ""
}

class Client : Record {
    @Field
    var url: String? = null

    @Field
    var accessToken: String? = null

    @Field
    var endpointId: Int? = null
}
