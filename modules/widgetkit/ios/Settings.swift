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
