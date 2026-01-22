package expo.modules.widgetkit

import android.content.Context
import android.content.Intent
import com.google.gson.Gson
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import androidx.core.content.edit

class WidgetKitModule : Module() {
    companion object {
        const val groupName = "group.com.pourtainer.mobile"
        const val connectionsKey = "pourtainer::connections"
		const val isSubscribedKey = "pourtainer::subscribed"
    }

    private fun notifyAllWidgets() {
        val intent = Intent().apply {
            action = "android.appwidget.action.APPWIDGET_UPDATE"
        }

        appContext.reactContext?.sendBroadcast(intent)
    }

    private fun getConnections(): List<Connection> {
        val rawConnections = appContext.reactContext
            ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)
            ?.getString(connectionsKey, "[]")

        return rawConnections?.let {
            Gson().fromJson(it, Array<Connection>::class.java).toList()
        } ?: emptyList()
    }

    override fun definition() = ModuleDefinition {
        Name("PourtainerWidgetKit")

        Function("getConnections") {
            return@Function this@WidgetKitModule.getConnections().map {
                mapOf(
                    "accessToken" to it.accessToken,
                    "id" to it.id,
                    "url" to it.url,
                )
            }
        }
		
		Function("setIsSubscribed") { isSubscribed: Boolean ->
            appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
                prefs.edit() {
                    putBoolean(isSubscribedKey, isSubscribed)
                    apply()
                }

                notifyAllWidgets()
            }
        }

        Function("addConnection") { connection: Connection ->
            appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
                val connections = this@WidgetKitModule.getConnections().toMutableList()

                // Add or update connection
                val index = connections.indexOfFirst { it.id == connection.id }

                if (index != -1) {
                    connections[index] = connection
                } else {
                    connections.add(connection)
                }

                prefs.edit() {
                    putString(connectionsKey, Gson().toJson(connections))
                    apply()
                }

                notifyAllWidgets()
            }
        }
		
		Function("setConnections") { connections: List<Connection> ->
			appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
                prefs.edit() {
                    putString(connectionsKey, Gson().toJson(connections))
                    apply()
                }

                notifyAllWidgets()
			}
        }
		
		Function("removeConnection") { id: String ->
            appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
                val connections = this@WidgetKitModule.getConnections().toMutableList().filter { it.id != id}

                prefs.edit() {
                    putString(connectionsKey, Gson().toJson(connections))
                    apply()
                }

                notifyAllWidgets()
            }
        }

		// also clears isSubscribed
        Function("clearAllConnections") {
            appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
                prefs.edit() {
                    clear()
                    apply()
                }

                notifyAllWidgets()
            }
        }
    }
}
