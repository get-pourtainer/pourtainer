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
        "appGroup" to groupName
      )
    }

    Function("registerAccessToken") { accessToken: String ->
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()

        editor.putString("accessToken", accessToken)

        editor.apply()
      }
    }

    Function("registerContainers") { containers: Array<ContainerSetting> ->
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()
        val json = Gson().toJson(containers)

        editor.putString("containers", json)

        editor.apply()
      }
    }

    Function("getAccessToken") {
      val maybeAccessToken = appContext.reactContext
        ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)
        ?.getString("accessToken", "")

      maybeAccessToken ?: ""
    }

    Function("getAvailableContainers") {
      val rawContainers = appContext.reactContext
        ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)
        ?.getString("containers", "[]")

      rawContainers?.let {
        Gson().fromJson(it, Array<ContainerSetting>::class.java)
      } ?: emptyArray<ContainerSetting>()
    }
  }
}
