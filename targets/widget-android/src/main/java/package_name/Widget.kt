package com.pourtainer.mobile

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import com.google.gson.Gson
import expo.modules.widgetkit.Client
import expo.modules.widgetkit.ContainerSetting
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import androidx.datastore.preferences.core.Preferences
import androidx.glance.currentState

class PourtainerWidget : GlanceAppWidget() {
    override var stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            PourtainerGlanceTheme {
                WidgetContent()
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

        // list is not empty and user selected container
        val state = currentState<Preferences>()
        val rawContainer = state[PourtainerWidgetReceiver.selectedContainer] ?: "null"
        val container = Gson().fromJson(rawContainer, ContainerSetting::class.java)

        ContainerView(container, "running")
    }
}

class PourtainerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PourtainerWidget()

    companion object {
        val selectedContainer = stringPreferencesKey("selectedContainer")

    }

    fun onContainerSelected(context: Context, glanceId: GlanceId, container: ContainerSetting?) {
        if (container == null) {
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(PourtainerWidget::class.java)
            glanceIds.forEach { runningGlanceId ->
                if (runningGlanceId == glanceId) {
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        prefs.toMutablePreferences().apply {
                            this[selectedContainer] = Gson().toJson(container)
                        }
                    }
                    glanceAppWidget.update(context, glanceId)
                }
            }
        }
    }
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
    val container = ContainerSetting()

    container.name = "Pourtainer"
    container.id = "1'"

    ContainerView(container, "running")
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview4() {
    val container = ContainerSetting()

    container.name = "Pourtainer"
    container.id = "1'"

    ContainerView(container, "exited")
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview5() {
    val container = ContainerSetting()

    container.name = "Pourtainer"
    container.id = "1'"

    ContainerView(container, "unknown")
}
