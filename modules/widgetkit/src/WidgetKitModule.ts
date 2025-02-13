import { NativeModule, requireNativeModule } from 'expo'
import type { ContainerSetting } from './WidgetKit.types'

declare class WidgetKitModule extends NativeModule {
    groupName: string
    getClient(): {
        url: string,
        accessToken: string
    }
    getAvailableContainers(): ContainerSetting[]
    registerClient(url: string, accessToken: string): void
    registerContainers(containers: ContainerSetting[]): void
}

export default requireNativeModule<WidgetKitModule>('PourtainerWidgetKit')
