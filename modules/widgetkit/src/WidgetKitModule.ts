import { NativeModule, requireNativeModule } from 'expo'
import type { Instance } from './WidgetKit.types'

declare class WidgetKitModule extends NativeModule {
    getInstances(): Instance[]
    registerInstance(instance: Instance): void
    clearAllInstances(): void
}

export default requireNativeModule<WidgetKitModule>('PourtainerWidgetKit')
