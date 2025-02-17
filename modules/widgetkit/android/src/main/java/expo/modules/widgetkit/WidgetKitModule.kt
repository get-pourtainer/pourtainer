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

    Function("registerClient") { client: Client ->
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()
        val json = Gson().toJson(client)

        editor.putString("client", json)

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

    Function("hasClient") {
      val rawClient = appContext.reactContext
              ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)
              ?.getString("client", "null")

      rawClient?.let {
        Gson().fromJson(it, Client::class.java)
      } != null
    }

    Function("clear") {
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val editor = prefs.edit()

        editor.clear()
        editor.apply()
      }
    }

    Function("updateEndpointId") { endpointId: Int ->
      appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
        val rawClient = prefs.getString("client", "null")

        rawClient?.let {
          val client = Gson().fromJson(it, Client::class.java)

          client.endpointId = endpointId

          val json = Gson().toJson(client)
          val editor = prefs.edit()

          editor.putString("client", json)
          editor.apply()
        }
      }
    }
  }
}
