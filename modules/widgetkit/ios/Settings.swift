import ExpoModulesCore

struct ContainerSetting: Record, Encodable, Decodable {
    init() {}
    
    @Field
    var name: String?

    @Field
    var id: String?

    enum CodingKeys: String, CodingKey {
        case name, id
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        name = try container.decodeIfPresent(String.self, forKey: .name)
        id = try container.decodeIfPresent(String.self, forKey: .id)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(id, forKey: .id)
    }
}

struct Client: Record, Encodable, Decodable {
    init() {}
    
    @Field
    var url: String?
    
    @Field
    var accessToken: String?
    
    @Field
    var endpointId: Int?
    
    enum CodingKeys: String, CodingKey {
        case url, accessToken, endpointId
    }
    
    init(from decoder: Decoder) throws {
        let client = try decoder.container(keyedBy: CodingKeys.self)
        
        url = try client.decodeIfPresent(String.self, forKey: .url)
        accessToken = try client.decodeIfPresent(String.self, forKey: .accessToken)
        endpointId = try client.decodeIfPresent(Int.self, forKey: .endpointId)
    }

    func encode(to encoder: Encoder) throws {
        var client = encoder.container(keyedBy: CodingKeys.self)
        try client.encodeIfPresent(url, forKey: .url)
        try client.encodeIfPresent(accessToken, forKey: .accessToken)
        try client.encodeIfPresent(endpointId, forKey: .endpointId)
    }
}
