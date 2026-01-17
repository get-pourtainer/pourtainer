import { updateContainer } from '@/api/mutations'
import { fetchContainer } from '@/api/queries'
import {
    type ContainerEditForm,
    editFormToCreateRequest,
    inspectResponseToEditForm,
} from '@/lib/container/transform'
import { COLORS } from '@/theme'
import { Ionicons } from '@expo/vector-icons'
import * as Sentry from '@sentry/react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { useGlobalSearchParams, useRouter } from 'expo-router'
import { type ReactNode, useEffect, useState } from 'react'
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import ContextMenu from 'react-native-context-menu-view'

const SectionContainer = ({
    title,
    children,
    endContent,
}: { title: string; children: ReactNode; endContent?: ReactNode }) => (
    <View>
        <View
            style={{
                paddingHorizontal: 20,
                height: 64,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 1,
                borderColor: COLORS.hr,
            }}
        >
            <Text
                style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: COLORS.text,
                }}
            >
                {title}
            </Text>
            {endContent}
        </View>
        <View style={{ backgroundColor: COLORS.bgSecondary + '50' }}>{children}</View>
    </View>
)

const FieldRow = ({ label, children }: { label: string; children: ReactNode }) => (
    <View
        style={{
            paddingHorizontal: 20,
            paddingVertical: 12,
            gap: 8,
            borderBottomWidth: 1,
            borderColor: COLORS.hr,
        }}
    >
        <Text style={{ fontSize: 14, color: COLORS.text }}>{label}</Text>
        {children}
    </View>
)

const ContextTypePicker = ({
    value,
    options,
    onSelect,
}: {
    value: string
    options: { label: string; value: string }[]
    onSelect: (value: string) => void
}) => {
    const valueMap: Record<string, string> = {}
    const labelMap: Record<string, string> = {}

    for (const option of options) {
        valueMap[option.label] = option.value
        labelMap[option.value] = option.label
    }

    return (
        <ContextMenu
            dropdownMenuMode={true}
            actions={options.map((opt) => ({ title: opt.label }))}
            onPress={(e) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                const selectedValue = valueMap[e.nativeEvent.name]
                if (selectedValue !== undefined) {
                    onSelect(selectedValue)
                }
            }}
        >
            <TouchableOpacity
                style={{
                    backgroundColor: COLORS.primaryDark,
                    padding: 12,
                    borderRadius: 6,
                }}
            >
                <Text style={{ color: COLORS.text }}>{labelMap[value] || value}</Text>
            </TouchableOpacity>
        </ContextMenu>
    )
}

export default function EditContainerScreen() {
    const { id } = useGlobalSearchParams<{ id: string }>()
    const router = useRouter()
    const queryClient = useQueryClient()

    const containerQuery = useQuery({
        queryKey: ['containers', id],
        queryFn: async () => await fetchContainer(id),
    })

    const [initialFormData, setInitialFormData] = useState<ContainerEditForm | null>(null)
    const [formData, setFormData] = useState<ContainerEditForm | null>(null)

    useEffect(() => {
        if (!containerQuery.data) return
        const converted = inspectResponseToEditForm(containerQuery.data)
        setInitialFormData(converted)
        setFormData(converted)
    }, [containerQuery.data])

    const updateMutation = useMutation({
        mutationFn: async (form: ContainerEditForm) => {
            const createRequest = editFormToCreateRequest(form)
            const createdContainerResponse = await updateContainer(createRequest, {
                id,
                name: form.basic.name,
            })
            return createdContainerResponse
        },
        onSuccess: (createdContainerResponse) => {
            router.dismissAll()
            queryClient.resetQueries({ queryKey: ['containers'] })
            router.push(`/container/${createdContainerResponse.Id}/`)
        },
        onError: (error) => {
            Sentry.captureException(error)
            Alert.alert('Error updating container', error.message)
        },
    })

    const handleSave = () => {
        if (!formData) return
        updateMutation.mutate(formData)
    }

    if (!formData) {
        return null
    }

    return (
        <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic">
            {/* Basic Section */}
            <SectionContainer title="Basic">
                <FieldRow label="Name">
                    <TextInput
                        style={{
                            backgroundColor: COLORS.primaryDark,
                            padding: 12,
                            borderRadius: 6,
                            color: COLORS.text,
                        }}
                        value={formData.basic.name}
                        onChangeText={(text) =>
                            setFormData((prev) =>
                                prev ? { ...prev, basic: { ...prev.basic, name: text } } : null
                            )
                        }
                        placeholder="Container name"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardAppearance="dark"
                    />
                </FieldRow>

                <FieldRow label="Image">
                    <TextInput
                        style={{
                            backgroundColor: COLORS.primaryDark,
                            padding: 12,
                            borderRadius: 6,
                            color: COLORS.text,
                        }}
                        value={formData.basic.image}
                        onChangeText={(text) =>
                            setFormData((prev) =>
                                prev ? { ...prev, basic: { ...prev.basic, image: text } } : null
                            )
                        }
                        placeholder="nginx:latest"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardAppearance="dark"
                    />
                </FieldRow>

                <FieldRow label="Logging">
                    <ContextTypePicker
                        value={formData.basic.logging}
                        options={[
                            { label: 'JSON File', value: 'json-file' },
                            { label: 'Local', value: 'local' },
                            { label: 'Syslog', value: 'syslog' },
                            { label: 'Journald', value: 'journald' },
                            { label: 'GELF', value: 'gelf' },
                            { label: 'Fluentd', value: 'fluentd' },
                            { label: 'AWS Logs', value: 'awslogs' },
                            { label: 'Splunk', value: 'splunk' },
                            { label: 'ETW Logs', value: 'etwlogs' },
                            { label: 'None', value: 'none' },
                        ]}
                        onSelect={(value) =>
                            setFormData((prev) =>
                                prev
                                    ? { ...prev, basic: { ...prev.basic, logging: value as any } }
                                    : null
                            )
                        }
                    />
                </FieldRow>

                <FieldRow label="Restart Policy">
                    <ContextTypePicker
                        value={formData.basic.restartPolicy}
                        options={[
                            { label: 'None', value: '' },
                            { label: 'No', value: 'no' },
                            { label: 'Always', value: 'always' },
                            { label: 'On Failure', value: 'on-failure' },
                            { label: 'Unless Stopped', value: 'unless-stopped' },
                        ]}
                        onSelect={(value) =>
                            setFormData((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          basic: { ...prev.basic, restartPolicy: value as any },
                                      }
                                    : null
                            )
                        }
                    />
                </FieldRow>
            </SectionContainer>

            {/* Ports Section */}
            <SectionContainer
                title="Ports"
                endContent={
                    <TouchableOpacity
                        onPress={() =>
                            setFormData((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          ports: [
                                              ...prev.ports,
                                              { hostPort: '', containerPort: '', protocol: 'tcp' },
                                          ],
                                      }
                                    : null
                            )
                        }
                        style={{
                            backgroundColor: COLORS.primary,
                            height: 32,
                            width: 32,
                            borderRadius: 6,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                }
            >
                {formData.ports.map((port, index) => (
                    <View
                        key={index}
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: COLORS.hr,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: COLORS.primaryDark,
                                padding: 12,
                                borderRadius: 6,
                                color: COLORS.text,
                            }}
                            value={port.hostPort}
                            onChangeText={(text) => {
                                const newPorts = [...formData.ports]
                                newPorts[index].hostPort = text
                                setFormData((prev) => (prev ? { ...prev, ports: newPorts } : null))
                            }}
                            placeholder="Host port"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                        <Text style={{ color: COLORS.text, paddingHorizontal: 8, fontSize: 18 }}>
                            →
                        </Text>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: COLORS.primaryDark,
                                padding: 12,
                                borderRadius: 6,
                                color: COLORS.text,
                            }}
                            value={port.containerPort}
                            onChangeText={(text) => {
                                const newPorts = [...formData.ports]
                                newPorts[index].containerPort = text
                                setFormData((prev) => (prev ? { ...prev, ports: newPorts } : null))
                            }}
                            placeholder="Container port"
                            placeholderTextColor={COLORS.textMuted}
                            keyboardType="numeric"
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                        <View style={{ width: 60 }}>
                            <ContextTypePicker
                                value={port.protocol}
                                options={[
                                    { label: 'TCP', value: 'tcp' },
                                    { label: 'UDP', value: 'udp' },
                                ]}
                                onSelect={(value) => {
                                    const newPorts = [...formData.ports]
                                    newPorts[index].protocol = value as 'tcp' | 'udp'
                                    setFormData((prev) =>
                                        prev ? { ...prev, ports: newPorts } : null
                                    )
                                }}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                const newPorts = formData.ports.filter((_, i) => i !== index)
                                setFormData((prev) => (prev ? { ...prev, ports: newPorts } : null))
                            }}
                            style={{
                                backgroundColor: COLORS.errorDark,
                                height: 42,
                                width: 42,
                                borderRadius: 6,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons name="close" size={24} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                ))}
            </SectionContainer>

            {/* Commands Section */}
            <SectionContainer title="Commands">
                <FieldRow label="Command">
                    <TextInput
                        style={{
                            backgroundColor: COLORS.primaryDark,
                            padding: 12,
                            borderRadius: 6,
                            color: COLORS.text,
                        }}
                        value={formData.commands.command.join(' ')}
                        onChangeText={(text) =>
                            setFormData((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          commands: {
                                              ...prev.commands,
                                              command: text.split(' ').filter(Boolean),
                                          },
                                      }
                                    : null
                            )
                        }
                        placeholder="leave empty for default"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardAppearance="dark"
                    />
                </FieldRow>

                <FieldRow label="Entrypoint">
                    <TextInput
                        style={{
                            backgroundColor: COLORS.primaryDark,
                            padding: 12,
                            borderRadius: 6,
                            color: COLORS.text,
                        }}
                        value={formData.commands.entrypoint.join(' ')}
                        onChangeText={(text) =>
                            setFormData((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          commands: {
                                              ...prev.commands,
                                              entrypoint: text.split(' ').filter(Boolean),
                                          },
                                      }
                                    : null
                            )
                        }
                        placeholder="leave empty for default"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardAppearance="dark"
                    />
                </FieldRow>

                <FieldRow label="Working Directory">
                    <TextInput
                        style={{
                            backgroundColor: COLORS.primaryDark,
                            padding: 12,
                            borderRadius: 6,
                            color: COLORS.text,
                        }}
                        value={formData.commands.workingDir}
                        onChangeText={(text) =>
                            setFormData((prev) =>
                                prev
                                    ? { ...prev, commands: { ...prev.commands, workingDir: text } }
                                    : null
                            )
                        }
                        placeholder="e.g. /myapp"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardAppearance="dark"
                    />
                </FieldRow>

                <FieldRow label="User">
                    <TextInput
                        style={{
                            backgroundColor: COLORS.primaryDark,
                            padding: 12,
                            borderRadius: 6,
                            color: COLORS.text,
                        }}
                        value={formData.commands.user}
                        onChangeText={(text) =>
                            setFormData((prev) =>
                                prev
                                    ? { ...prev, commands: { ...prev.commands, user: text } }
                                    : null
                            )
                        }
                        placeholder="e.g. nginx"
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        keyboardAppearance="dark"
                    />
                </FieldRow>

                <FieldRow label="Console">
                    <ContextTypePicker
                        value={formData.commands.console}
                        options={[
                            { label: 'Interactive & TTY', value: 'interactive-tty' },
                            { label: 'TTY', value: 'tty' },
                            { label: 'Interactive', value: 'interactive' },
                            { label: 'None', value: 'none' },
                        ]}
                        onSelect={(value) =>
                            setFormData((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          commands: { ...prev.commands, console: value as any },
                                      }
                                    : null
                            )
                        }
                    />
                </FieldRow>
            </SectionContainer>

            {/* Environment Variables Section */}
            <SectionContainer
                title="Environment Variables"
                endContent={
                    <TouchableOpacity
                        onPress={() =>
                            setFormData((prev) =>
                                prev
                                    ? { ...prev, env: [...prev.env, { key: '', value: '' }] }
                                    : null
                            )
                        }
                        style={{
                            backgroundColor: COLORS.primary,
                            height: 32,
                            width: 32,
                            borderRadius: 6,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                }
            >
                {formData.env.map((envVar, index) => (
                    <View
                        key={index}
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            borderBottomWidth: 1,
                            borderColor: COLORS.hr,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: COLORS.primaryDark,
                                padding: 12,
                                borderRadius: 6,
                                color: COLORS.text,
                            }}
                            value={envVar.key}
                            onChangeText={(text) => {
                                const newEnv = [...formData.env]
                                newEnv[index].key = text
                                setFormData((prev) => (prev ? { ...prev, env: newEnv } : null))
                            }}
                            placeholder="Name"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                        <Text style={{ color: COLORS.text, paddingHorizontal: 8, fontSize: 18 }}>
                            =
                        </Text>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: COLORS.primaryDark,
                                padding: 12,
                                borderRadius: 6,
                                color: COLORS.text,
                            }}
                            value={envVar.value}
                            onChangeText={(text) => {
                                const newEnv = [...formData.env]
                                newEnv[index].value = text
                                setFormData((prev) => (prev ? { ...prev, env: newEnv } : null))
                            }}
                            placeholder="Value"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                        <TouchableOpacity
                            onPress={() => {
                                const newEnv = formData.env.filter((_, i) => i !== index)
                                setFormData((prev) => (prev ? { ...prev, env: newEnv } : null))
                            }}
                            style={{
                                backgroundColor: COLORS.errorDark,
                                height: 42,
                                width: 42,
                                borderRadius: 6,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons name="close" size={24} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                ))}
            </SectionContainer>

            {/* Labels Section */}
            <SectionContainer
                title="Labels"
                endContent={
                    <TouchableOpacity
                        onPress={() =>
                            setFormData((prev) =>
                                prev
                                    ? { ...prev, labels: [...prev.labels, { key: '', value: '' }] }
                                    : null
                            )
                        }
                        style={{
                            backgroundColor: COLORS.primary,
                            height: 32,
                            width: 32,
                            borderRadius: 6,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                }
            >
                {formData.labels.map((label, index) => (
                    <View
                        key={index}
                        style={{
                            borderBottomWidth: 1,
                            borderColor: COLORS.hr,
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: COLORS.primaryDark,
                                padding: 12,
                                borderRadius: 6,
                                color: COLORS.text,
                            }}
                            value={label.key}
                            onChangeText={(text) => {
                                const newLabels = [...formData.labels]
                                newLabels[index].key = text
                                setFormData((prev) =>
                                    prev ? { ...prev, labels: newLabels } : null
                                )
                            }}
                            placeholder="Name"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                        <Text style={{ color: COLORS.text, paddingHorizontal: 8, fontSize: 18 }}>
                            =
                        </Text>
                        <TextInput
                            style={{
                                flex: 1,
                                backgroundColor: COLORS.primaryDark,
                                padding: 12,
                                borderRadius: 6,
                                color: COLORS.text,
                            }}
                            value={label.value}
                            onChangeText={(text) => {
                                const newLabels = [...formData.labels]
                                newLabels[index].value = text
                                setFormData((prev) =>
                                    prev ? { ...prev, labels: newLabels } : null
                                )
                            }}
                            placeholder="Value"
                            placeholderTextColor={COLORS.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="off"
                            keyboardAppearance="dark"
                        />
                        <TouchableOpacity
                            onPress={() => {
                                const newLabels = formData.labels.filter((_, i) => i !== index)
                                setFormData((prev) =>
                                    prev ? { ...prev, labels: newLabels } : null
                                )
                            }}
                            style={{
                                backgroundColor: COLORS.errorDark,
                                height: 42,
                                width: 42,
                                borderRadius: 6,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons name="close" size={24} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>
                ))}
            </SectionContainer>

            {/* Volumes Section */}
            <SectionContainer
                title="Volumes"
                endContent={
                    <TouchableOpacity
                        onPress={() =>
                            setFormData((prev) =>
                                prev
                                    ? {
                                          ...prev,
                                          volumes: [
                                              ...prev.volumes,
                                              {
                                                  containerPath: '',
                                                  hostPath: '',
                                                  type: 'bind',
                                                  readOnly: false,
                                              },
                                          ],
                                      }
                                    : null
                            )
                        }
                        style={{
                            backgroundColor: COLORS.primary,
                            height: 32,
                            width: 32,
                            borderRadius: 6,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                }
            >
                {formData.volumes.map((volume, index) => (
                    <View
                        key={index}
                        style={{
                            paddingHorizontal: 20,
                            paddingVertical: 12,
                            gap: 12,
                            borderBottomWidth: 1,
                            borderColor: COLORS.hr,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    backgroundColor: COLORS.primaryDark,
                                    padding: 12,
                                    borderRadius: 6,
                                    color: COLORS.text,
                                }}
                                value={volume.containerPath}
                                onChangeText={(text) => {
                                    const newVolumes = [...formData.volumes]
                                    newVolumes[index].containerPath = text
                                    setFormData((prev) =>
                                        prev ? { ...prev, volumes: newVolumes } : null
                                    )
                                }}
                                placeholder="Container path"
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                            />
                            <View style={{ width: 80 }}>
                                <ContextTypePicker
                                    value={volume.type}
                                    options={[
                                        { label: 'Volume', value: 'volume' },
                                        { label: 'Bind', value: 'bind' },
                                    ]}
                                    onSelect={(value) => {
                                        const newVolumes = [...formData.volumes]
                                        newVolumes[index].type = value as 'volume' | 'bind'
                                        setFormData((prev) =>
                                            prev ? { ...prev, volumes: newVolumes } : null
                                        )
                                    }}
                                />
                            </View>
                        </View>
                        <Text
                            style={{
                                color: COLORS.textMuted,
                                textAlign: 'center',
                                fontSize: 16,
                            }}
                        >
                            ↓
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TextInput
                                style={{
                                    flex: 1,
                                    backgroundColor: COLORS.primaryDark,
                                    padding: 12,
                                    borderRadius: 6,
                                    color: COLORS.text,
                                }}
                                value={volume.hostPath}
                                onChangeText={(text) => {
                                    const newVolumes = [...formData.volumes]
                                    newVolumes[index].hostPath = text
                                    setFormData((prev) =>
                                        prev ? { ...prev, volumes: newVolumes } : null
                                    )
                                }}
                                placeholder={volume.type === 'volume' ? 'Volume name' : 'Host path'}
                                placeholderTextColor={COLORS.textMuted}
                                autoCapitalize="none"
                                autoCorrect={false}
                                autoComplete="off"
                                keyboardAppearance="dark"
                            />
                            <View style={{ width: 80 }}>
                                <ContextTypePicker
                                    value={volume.readOnly ? 'readonly' : 'writable'}
                                    options={[
                                        { label: 'Writable', value: 'writable' },
                                        { label: 'Read Only', value: 'readonly' },
                                    ]}
                                    onSelect={(value) => {
                                        const newVolumes = [...formData.volumes]
                                        newVolumes[index].readOnly = value === 'readonly'
                                        setFormData((prev) =>
                                            prev ? { ...prev, volumes: newVolumes } : null
                                        )
                                    }}
                                />
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    const newVolumes = formData.volumes.filter(
                                        (_, i) => i !== index
                                    )
                                    setFormData((prev) =>
                                        prev ? { ...prev, volumes: newVolumes } : null
                                    )
                                }}
                                style={{
                                    backgroundColor: COLORS.errorDark,
                                    height: 42,
                                    width: 42,
                                    borderRadius: 6,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Ionicons name="close" size={24} color={COLORS.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </SectionContainer>

            {/* Save Button */}
            <TouchableOpacity
                onPress={handleSave}
                disabled={updateMutation.isPending}
                style={{
                    backgroundColor: updateMutation.isPending ? COLORS.primaryDark : COLORS.primary,
                    padding: 16,
                    borderRadius: 8,
                    marginHorizontal: 20,
                    marginTop: 24,
                    marginBottom: 32,
                }}
            >
                <Text
                    style={{ color: 'white', textAlign: 'center', fontSize: 16, fontWeight: '600' }}
                >
                    {updateMutation.isPending ? 'Updating...' : 'Update Container'}
                </Text>
            </TouchableOpacity>

            {/* Debug info - can be removed later */}
            {/* <View
                style={{
                    marginTop: 20,
                    padding: 16,
                    backgroundColor: COLORS.bgSecondary,
                    borderRadius: 8,
                }}
            >
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>
                    Debug - Container Keys:
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.text }}>
                    {JSON.stringify(Object.keys(containerQuery.data || {}), null, 2)}
                </Text>
            </View> */}
        </ScrollView>
    )
}
