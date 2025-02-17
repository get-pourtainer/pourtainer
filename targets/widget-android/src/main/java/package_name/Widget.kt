package com.pourtainer.mobile

import android.appwidget.AppWidgetManager
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import com.google.gson.Gson
import expo.modules.widgetkit.Client
import expo.modules.widgetkit.ContainerSetting
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PourtainerWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            PourtainerGlanceTheme {
                WidgetContent()
            }
        }
    }

    companion object {
        internal fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            CoroutineScope(Dispatchers.IO).launch {
                val glanceId = GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId)

                PourtainerWidget().update(context, glanceId)
            }
        }
    }
}

@Composable
fun WidgetContent() {
    val context = LocalContext.current
    val prefs = context.getSharedPreferences("group.com.pourtainer.mobile", Context.MODE_PRIVATE)
    val rawContainers = prefs.getString("containers", "[]")
    val containerList = Gson().fromJson(rawContainers, Array<ContainerSetting>::class.java) ?: emptyArray()
    val rawClient = prefs.getString("client", "null")
    val client = Gson().fromJson(rawClient, Client::class.java)
    val isAuthorized = client != null

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .background(GlanceTheme.colors.background)
    ) {
        if (!isAuthorized) {
            UnauthorizedView(context)
            return@Column
        }

        if (containerList.isEmpty()) {
            NoContainersView(context)
            return@Column
        }

        ContainerView(context)
    }
}

class PourtainerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = PourtainerWidget()
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview() {
    val context = LocalContext.current

    UnauthorizedView(context)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview2() {
    val context = LocalContext.current

    NoContainersView(context)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview3() {
    val context = LocalContext.current

    ContainerView(context)
}
