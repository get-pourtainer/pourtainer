import ExpoModulesCore

struct Instance: Record, Encodable, Decodable {
    init() {}
    
    @Field
    var url: String?
    
    @Field
    var accessToken: String?
    
    @Field
    var instanceId: String?
    
    enum CodingKeys: String, CodingKey {
        case url, accessToken, instanceId
    }
    
    init(from decoder: Decoder) throws {
        let client = try decoder.container(keyedBy: CodingKeys.self)
        
        url = try client.decodeIfPresent(String.self, forKey: .url)
        accessToken = try client.decodeIfPresent(String.self, forKey: .accessToken)
        instanceId = try client.decodeIfPresent(String.self, forKey: .instanceId)
    }

    func encode(to encoder: Encoder) throws {
        var client = encoder.container(keyedBy: CodingKeys.self)
        
        try client.encodeIfPresent(url, forKey: .url)
        try client.encodeIfPresent(accessToken, forKey: .accessToken)
        try client.encodeIfPresent(instanceId, forKey: .instanceId)
    }
}
