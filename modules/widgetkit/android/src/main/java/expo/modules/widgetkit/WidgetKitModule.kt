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
        const val instancesKey = "pourtainer::instances"
    }

    private fun notifyAllWidgets() {
        val intent = Intent().apply {
            action = "android.appwidget.action.APPWIDGET_UPDATE"
        }

        appContext.reactContext?.sendBroadcast(intent)
    }

    private fun getInstances(): List<Instance> {
        val rawInstances = appContext.reactContext
            ?.getSharedPreferences(groupName, Context.MODE_PRIVATE)
            ?.getString(instancesKey, "null")

        return rawInstances?.let {
            Gson().fromJson(it, Array<Instance>::class.java).toList()
        } ?: emptyList()
    }

    override fun definition() = ModuleDefinition {

        Name("PourtainerWidgetKit")

        Function("getInstances") {
            return@Function this@WidgetKitModule.getInstances()
        }

        Function("registerInstance") { instance: Instance ->
            appContext.reactContext?.getSharedPreferences(groupName, Context.MODE_PRIVATE)?.let { prefs ->
                val instances = this@WidgetKitModule.getInstances().toMutableList()

                // Add or update instance
                val index = instances.indexOfFirst { it.instanceId == instance.instanceId }

                if (index != -1) {
                    instances[index] = instance
                } else {
                    instances.add(instance)
                }

                prefs.edit() {
                    putString(instancesKey, Gson().toJson(instances))
                    apply()
                }

                notifyAllWidgets()
            }
        }

        Function("clearAllInstances") {
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
