import { useMemo } from 'react'
import { Platform } from 'react-native'

export function useFlashlistProps(placeholder?: React.ReactNode) {
    const isAndroid = useMemo(() => Platform.OS === 'android', [])

    if (isAndroid) {
        return {
            overrideProps: undefined,
        }
    }

    return {
        overrideProps: placeholder
            ? {
                  contentContainerStyle: {
                      flex: 1,
                  },
              }
            : undefined,
    }
}
