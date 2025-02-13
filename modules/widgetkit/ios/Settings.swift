import ExpoModulesCore

struct ContainerSetting: Record, Encodable {
    @Field
    var name: String?
    
    @Field
    var id: String?
    
    enum CodingKeys: String, CodingKey {
        case name, id
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encodeIfPresent(name, forKey: .name)
        try container.encodeIfPresent(id, forKey: .id)
    }
}
