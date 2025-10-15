import WidgetKitModule from '@/modules/widgetkit'
import { COLORS } from '@/theme'
import Superwall from '@superwall/react-native-superwall'
import { useEffect, useState } from 'react'
import { Alert, Text, TouchableOpacity } from 'react-native'

export default function ContainerWidgetMessage() {
    const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)

    useEffect(() => {
        Superwall.shared.getSubscriptionStatus().then(({ status }) => {
            setIsSubscribed(status === 'ACTIVE')
        })
    }, [])

    if (isSubscribed === null) {
        return null
    }

    if (isSubscribed) {
        return null
    }

    return (
        <TouchableOpacity
            style={{
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: COLORS.primaryDark,
            }}
            onPress={() => {
                Superwall.shared
                    .register({
                        placement: 'TapWidget',
                        feature: () => {
                            WidgetKitModule.setIsSubscribed(true)
                            Alert.alert(
                                'Congrats, you can now go to your homescreen and search for "Pourtainer" widgets'
                            )
                        },
                    })
                    .catch((error) => {
                        console.error('Error registering TapWidget', error)
                        Alert.alert('Error', 'Something went wrong, please try again.')
                    })
            }}
        >
            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '500' }}>
                Add this container as a widget on your homescreen!
            </Text>
        </TouchableOpacity>
    )
}
