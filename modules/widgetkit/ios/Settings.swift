import ExpoModulesCore

struct Connection: Record, Encodable, Decodable {
    init() {}
    
    @Field
    var url: String?
    
    @Field
    var accessToken: String?
    
    @Field
    var id: String?
    
    enum CodingKeys: String, CodingKey {
        case url, accessToken, id
    }
    
    init(from decoder: Decoder) throws {
        let client = try decoder.container(keyedBy: CodingKeys.self)
        
        url = try client.decodeIfPresent(String.self, forKey: .url)
        accessToken = try client.decodeIfPresent(String.self, forKey: .accessToken)
        id = try client.decodeIfPresent(String.self, forKey: .id)
    }

    func encode(to encoder: Encoder) throws {
        var client = encoder.container(keyedBy: CodingKeys.self)
        
        try client.encodeIfPresent(url, forKey: .url)
        try client.encodeIfPresent(accessToken, forKey: .accessToken)
        try client.encodeIfPresent(id, forKey: .id)
    }
}
