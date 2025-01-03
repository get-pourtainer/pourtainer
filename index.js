import 'expo-router/entry'
import Gesture from 'react-native-gesture-handler'
import Reanimated from 'react-native-reanimated'
import './unistyles'
import * as SplashScreen from 'expo-splash-screen'

console.log(Gesture)
console.log(Reanimated)
SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({
    duration: 500,
    fade: true,
})
