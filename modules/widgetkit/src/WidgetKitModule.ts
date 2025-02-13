import { NativeModule, requireNativeModule } from 'expo'
import type { ContainerSetting } from './WidgetKit.types'

declare class WidgetKitModule extends NativeModule {
    groupName: string
    registerAccessToken(accessToken: string): void
    registerContainers(containers: ContainerSetting[]): void
}

export default requireNativeModule<WidgetKitModule>('WidgetKit')
