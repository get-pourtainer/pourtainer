import { NativeModule, requireNativeModule } from 'expo'
import type { Client, ContainerSetting } from './WidgetKit.types'

declare class WidgetKitModule extends NativeModule {
    groupName: string
    hasClient(): boolean
    registerClient(client: Client): void
    registerContainers(containers: ContainerSetting[]): void
    updateEndpointId(endpointId: number): void
    clear(): void
}

export default requireNativeModule<WidgetKitModule>('PourtainerWidgetKit')
