package com.pourtainer.mobile

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.glance.appwidget.GlanceAppWidgetManager
import com.google.gson.Gson
import expo.modules.widgetkit.Client
import expo.modules.widgetkit.ContainerSetting

class PourtainerAppWidgetConfigurationActivity : AppCompatActivity() {
    private var selectedContainer: ContainerSetting? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setResult(RESULT_CANCELED)

        val appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()

            return
        }

        val prefs = getSharedPreferences("group.com.pourtainer.mobile", Context.MODE_PRIVATE)
        val rawContainers = prefs.getString("containers", "[]")
        val containerList = Gson().fromJson(rawContainers, Array<ContainerSetting>::class.java) ?: emptyArray()
        val rawClient = prefs.getString("client", "null")
        val client = Gson().fromJson(rawClient, Client::class.java)

        setContent {
            PourtainerMaterialTheme {
                WidgetConfigurationView (
                    isAuthorized = client != null,
                    containers = containerList,
                    onContainerSelected = { container ->
                        this.selectedContainer = container
                    },
                    onDone = {
                        val glanceId = GlanceAppWidgetManager(applicationContext).getGlanceIdBy(appWidgetId)

                        PourtainerWidgetReceiver().onContainerSelected(context = applicationContext, glanceId, selectedContainer)

                        val resultValue = Intent()

                        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                        setResult(RESULT_OK, resultValue)
                        finish()
                    },
                    openApp = {
                        val intent = packageManager.getLaunchIntentForPackage("com.pourtainer.mobile")
                        intent?.let { startActivity(it) }
                    }
                )
            }
        }
    }
}
