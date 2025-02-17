package com.pourtainer.mobile

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import expo.modules.widgetkit.ContainerSetting

class PourtainerAppWidgetConfigurationActivity : AppCompatActivity() {
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

        setContent {
            WidgetConfigurationView (
                containers = containerList,
                onContainerSelected = { selected ->
                    prefs.edit().putString("selectedContainerId", selected.id).apply()
                },
                onDone = {
                    val appWidgetManager = AppWidgetManager.getInstance(this)
                    PourtainerWidget.updateAppWidget(this, appWidgetManager, appWidgetId)

                    val resultValue = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)

                    setResult(RESULT_OK, resultValue)
                    finish()
                }
            )
        }
    }
}
