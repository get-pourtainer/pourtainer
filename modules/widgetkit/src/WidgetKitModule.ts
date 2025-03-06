import { NativeModule, requireNativeModule } from 'expo'
import type { Connection } from './WidgetKit.types'

declare class WidgetKitModule extends NativeModule {
    getConnections(): Connection[]
    registerConnection(connection: Connection): void
    clearAllConnections(): void
}

export default requireNativeModule<WidgetKitModule>('PourtainerWidgetKit')
