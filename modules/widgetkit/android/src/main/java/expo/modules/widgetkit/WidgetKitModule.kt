package expo.modules.widgetkit

import android.content.Context
import com.google.gson.Gson
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WidgetKitModule : Module() {
  override fun definition() = ModuleDefinition {
    val groupName: String = "group.com.pourtainer.mobile"

    Name("PourtainerWidgetKit")

    Constants {
      return@Constants mapOf(
        // this has nothing to do with app group but acts like a key
        "groupName" to groupName
      )
    }

    Function("registerClient") { url: String, accessToken: String ->
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()

        editor.putString("url", url)
        editor.putString("accessToken", accessToken)

        editor.apply()
      }
    }

    Function("registerContainers") { containers: List<ContainerSetting> ->
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()
        val json = Gson().toJson(containers)

        editor.putString("containers", json)

        editor.apply()
      }
    }

    Function("getClient") {
      val prefs = appContext.reactContext
        ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)

      val sharedPrefs = prefs ?: return@Function mapOf(
        "url" to "",
        "accessToken" to ""
      )

      val maybeUrl = sharedPrefs.getString("url", "")
      val maybeAccessToken = sharedPrefs.getString("accessToken", "")

      return@Function mapOf(
        "url" to maybeUrl,
        "accessToken" to maybeAccessToken
      )
    }

    Function("getAvailableContainers") {
      val rawContainers = appContext.reactContext
        ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)
        ?.getString("containers", "[]")

      rawContainers?.let {
        Gson().fromJson(it, Array<ContainerSetting>::class.java)
      } ?: emptyArray<ContainerSetting>()
    }

    Function("clear") {
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()

        editor.clear()
        editor.apply()
      }
    }
  }
}
