package expo.modules.widgetkit

import android.appwidget.AppWidgetManager
import android.content.ComponentName
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
        // Must match `receiverName` in app.config.js (withAndroidWidget)
        const val receiverClassName = "ContainerWidgetReceiver"
    }

    private fun prefs() = appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)

    /**
     * Implicit APPWIDGET_UPDATE broadcasts are not delivered to manifest receivers
     * on Android 8+, so the receiver component and the widget ids are named explicitly.
     */
    private fun notifyAllWidgets() {
        val context = appContext.reactContext ?: return
        val receiver = ComponentName(context.packageName, "${context.packageName}.$receiverClassName")
        val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(receiver)
        if (ids.isEmpty()) return

        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            .setComponent(receiver)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        context.sendBroadcast(intent)
    }

    private fun getConnections(): List<Connection> {
        val rawConnections = prefs()?.getString(connectionsKey, "[]")

        return rawConnections?.let {
            runCatching { Gson().fromJson(it, Array<Connection>::class.java).toList() }.getOrNull()
        } ?: emptyList()
    }

    private fun saveConnections(connections: List<Connection>) {
        val prefs = prefs() ?: return
        val serialized = Gson().toJson(connections)

        // Unchanged payloads must not trigger a widget reload
        if (prefs.getString(connectionsKey, null) == serialized) return

        prefs.edit {
            putString(connectionsKey, serialized)
            apply()
        }

        notifyAllWidgets()
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
            prefs()?.let { prefs ->
                if (prefs.contains(isSubscribedKey) && prefs.getBoolean(isSubscribedKey, false) == isSubscribed) {
                    return@let
                }

                prefs.edit {
                    putBoolean(isSubscribedKey, isSubscribed)
                    apply()
                }

                notifyAllWidgets()
            }
        }

        Function("addConnection") { connection: Connection ->
            val connections = this@WidgetKitModule.getConnections().toMutableList()
            val index = connections.indexOfFirst { it.id == connection.id }

            if (index != -1) {
                connections[index] = connection
            } else {
                connections.add(connection)
            }

            saveConnections(connections)
        }

        Function("setConnections") { connections: List<Connection> ->
            saveConnections(connections)
        }

        Function("removeConnection") { id: String ->
            saveConnections(this@WidgetKitModule.getConnections().filter { it.id != id })
        }

        // Only the connections; the subscription flag is managed by setIsSubscribed
        Function("clearAllConnections") {
            prefs()?.let { prefs ->
                prefs.edit {
                    remove(connectionsKey)
                    apply()
                }

                notifyAllWidgets()
            }
        }
    }
}
