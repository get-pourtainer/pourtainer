package com.pourtainer.mobile

import ContainerMetadata
import Endpoint
import LogLine
import SelectedContainer
import WidgetIntentState
import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.core.net.toUri
import androidx.datastore.preferences.core.Preferences
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import com.google.gson.Gson
import isSubscribed
import loadConnections
import java.util.UUID

class ContainerWidget : GlanceAppWidget() {
    companion object {
        private val SMALL = DpSize(100.dp, 56.dp)
        private val LARGE = DpSize(100.dp, 115.dp)
    }

    override val sizeMode = SizeMode.Responsive(setOf(SMALL, LARGE))

    override var stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // App-owned settings are read here on every render instead of being copied
        // into widget state by a broadcast that may never arrive
        val hasConnections = loadConnections(context).isNotEmpty()
        val subscribed = isSubscribed(context)

        provideContent {
            PourtainerGlanceTheme {
                WidgetContent(hasConnections, subscribed)
            }
        }
    }
}

private inline fun <reified T> Preferences.decode(key: Preferences.Key<String>): T? =
    this[key]?.let { runCatching { Gson().fromJson(it, T::class.java) }.getOrNull() }

@Composable
fun WidgetContent(hasConnections: Boolean, subscribed: Boolean) {
    val state = currentState<Preferences>()
    val widgetState = WidgetIntentState.parse(state[ContainerWidgetReceiver.widgetStateKey])
    val selected = state.decode<SelectedContainer>(ContainerWidgetReceiver.selectedContainerKey)

    val openApp = actionStartActivity(Intent(Intent.ACTION_VIEW, "pourtainer://".toUri()))
    val openPaywall = actionStartActivity(Intent(Intent.ACTION_VIEW, "pourtainer://?showPaywall=1".toUri()))

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .background(GlanceTheme.colors.background)
    ) {
        when {
            !hasConnections ->
                StatusView("Unauthorized", "Sign in with Pourtainer app", openApp)
            !subscribed ->
                StatusView("Subscription missing", "Tap here to enable", openPaywall)
            selected == null ->
                StatusView("Not configured", "Long-press the widget to pick a container", openApp)
            widgetState == WidgetIntentState.NOT_FOUND ->
                StatusView("Container not found", "Configure your widget and select a new container", openApp)
            widgetState == WidgetIntentState.API_FAILED ->
                StatusView("Api error", "We couldn't fetch data from api", openApp)
            else -> {
                val metadata = state.decode<ContainerMetadata>(ContainerWidgetReceiver.containerMetadataKey)
                val logs = state.decode<Array<LogLine>>(ContainerWidgetReceiver.containerLogsKey)?.toList()
                    ?: emptyList()

                if (metadata == null) {
                    StatusView("Loading...", "We're getting your container details", openApp)
                } else {
                    ContainerView(metadata, logs)
                }
            }
        }
    }
}

private fun previewContainer() = ContainerMetadata(
    id = "1",
    name = "Pourtainer",
    state = "running",
    connectionId = "preview",
    endpoint = Endpoint(Id = 1, Name = "Endpoint 1")
)

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview() {
    StatusView("Unauthorized", "Sign in with Pourtainer app")
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview2() {
    StatusView("Api error", "We couldn't fetch data from api")
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview3() {
    ContainerView(
        previewContainer(),
        listOf(
            LogLine(UUID.randomUUID(), "Starting application..."),
            LogLine(UUID.randomUUID(), "Connected to database"),
            LogLine(UUID.randomUUID(), "Server listening on port 8080")
        )
    )
}
