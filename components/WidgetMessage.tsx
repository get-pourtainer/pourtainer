import { COLORS } from '@/theme'
import * as Sentry from '@sentry/react-native'
import { usePlacement, useUser } from 'expo-superwall'
import { Alert, Text, TouchableOpacity } from 'react-native'

export default function ContainerWidgetMessage() {
    const { registerPlacement } = usePlacement()
    const { subscriptionStatus } = useUser()

    if (subscriptionStatus.status !== 'INACTIVE') {
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
                registerPlacement({
                    placement: 'TapWidget',
                    feature: () => {
                        Alert.alert(
                            'Congrats!',
                            'You can now go to your homescreen and search for "Pourtainer" widgets'
                        )
                    },
                }).catch((error) => {
                    Sentry.captureException(error)
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
