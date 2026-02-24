import 'expo-router/entry'
import './lib/prebundle'
import * as SplashScreen from 'expo-splash-screen'

SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({
    duration: 500,
    fade: true,
})
