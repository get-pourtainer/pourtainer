import { ActionSheetIOS, Alert, Platform } from 'react-native'

export type ActionSheetOption = {
    label: string
    onPress: () => Promise<void> | void
    destructive?: boolean
    cancel?: boolean
}

export function showActionSheet(title: string, options: ActionSheetOption[]) {
    if (Platform.OS === 'ios') {
        const iosOptions = options.map((opt) => opt.label)
        const cancelButtonIndex = options.findIndex((opt) => opt.cancel)
        const destructiveButtonIndices: number[] = options.reduce((acc, opt, index) => {
            if (opt.destructive) {
                acc.push(index)
            }
            return acc
        }, [] as number[])

        ActionSheetIOS.showActionSheetWithOptions(
            {
                options: iosOptions,
                cancelButtonIndex,
                destructiveButtonIndex: destructiveButtonIndices,
                title,
            },
            async (buttonIndex) => {
                if (buttonIndex !== cancelButtonIndex) {
                    const selectedOption = options[buttonIndex]
                    await selectedOption.onPress()
                }
            }
        )
    } else {
        Alert.alert(
            title,
            undefined,
            options.map((opt) => ({
                text: opt.label,
                style: opt.cancel ? 'cancel' : opt.destructive ? 'destructive' : 'default',
                onPress: opt.onPress,
            })),
            { cancelable: true }
        )
    }
} 