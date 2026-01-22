import { createMMKV } from 'react-native-mmkv'

const storage = createMMKV({
    id: 'pourtainer-mobile',
})

export const mmkvStorage = {
    clearAll: () => {
        storage.clearAll()
    },
    getItem: (key: string) => {
        const value = storage.getString(key)
        return value ?? null
    },
    setItem: (key: string, value: string) => {
        storage.set(key, value)
    },
    removeItem: (key: string) => {
        storage.remove(key)
    },
}
