package com.pourtainer.mobile

import Container
import ContainerState
import LogLine
import WidgetIntentState
import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalContext
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.preview.ExperimentalGlancePreviewApi
import androidx.glance.preview.Preview
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import com.google.gson.Gson
import androidx.datastore.preferences.core.Preferences
import androidx.glance.currentState
import expo.modules.widgetkit.Instance
import java.util.UUID
import androidx.glance.layout.size
import androidx.glance.LocalSize
import androidx.compose.ui.unit.DpSize
import androidx.glance.appwidget.SizeMode

class ContainerWidget: GlanceAppWidget() {
	   companion object {
        private val SMALL = DpSize(100.dp, 56.dp)
        private val LARGE = DpSize(100.dp, 115.dp)
    }

    override val sizeMode = SizeMode.Responsive(
        setOf(
            SMALL,
            LARGE,
        )
    )
	
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
    val state = currentState<Preferences>()

    val rawWidgetState = state[ContainerWidgetReceiver.widgetStateKey] ?: "null"
    val widgetState = Gson().fromJson(rawWidgetState, WidgetIntentState::class.java) ?: WidgetIntentState.LOADING
    val rawInstances = state[ContainerWidgetReceiver.instancesKey] ?: "[]"
    val instances = Gson().fromJson(rawInstances, Array<Instance>::class.java) ?: emptyArray()
    val isAuthorized = instances.isNotEmpty()

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .background(GlanceTheme.colors.background)
    ) {
        // No instances - user needs to sign in
        if (!isAuthorized) {
            StatusView("Unauthorized", "Sign in with Pourtainer app", context)
            return@Column
        }

        // No containers available
        if (widgetState == WidgetIntentState.NO_CONTAINERS) {
            StatusView("No containers", "Add your first container to show it here", context)
            return@Column
        }

        // API error
        if (widgetState == WidgetIntentState.API_FAILED) {
            StatusView("Api error", "We couldn't fetch data from api", context)
            return@Column
        }

        // Loading or unknown state
        if (widgetState == WidgetIntentState.LOADING) {
            StatusView("Loading...", "We're getting your container details", context)
            return@Column
        }

        // Container successfully loaded - show container info
        val rawContainerDetails = state[ContainerWidgetReceiver.containerMetadataKey] ?: "null"
        val containerDetails = Gson().fromJson(rawContainerDetails, Container::class.java)
        
        // Get container logs
        val rawContainerLogs = state[ContainerWidgetReceiver.containerLogsKey] ?: "[]"
        val containerLogs = Gson().fromJson(rawContainerLogs, Array<LogLine>::class.java) ?: emptyArray()
        
        // Show container view with logs
        ContainerView(containerDetails, containerLogs.toList())
    }
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview() {
    val context = LocalContext.current
    StatusView("Unauthorized", "Sign in with Pourtainer app", context)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview2() {
    val context = LocalContext.current
    StatusView("Api error", "We couldn't fetch data from api", context)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview3() {
    val context = LocalContext.current
    StatusView("Container not found", "Configure your widget and select new container", context)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview4() {
    val container = Container(
        Id = "1",
        Name = "Pourtainer",
        State = ContainerState(
            StartedAt = "",
            Status = "running"
        )
    )
    
    val logs = listOf(
        LogLine(UUID.randomUUID(), "Starting application..."),
        LogLine(UUID.randomUUID(), "Connected to database"),
        LogLine(UUID.randomUUID(), "Server listening on port 8080"),
        LogLine(UUID.randomUUID(), "Received first request")
    )

    ContainerView(container, logs)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview5() {
    val container = Container(
        Id = "1",
        Name = "Pourtainer",
        State = ContainerState(
            StartedAt = "",
            Status = "exited"
        )
    )
    
    val logs = listOf(
        LogLine(UUID.randomUUID(), "Process exited with code 0")
    )

    ContainerView(container, logs)
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview6() {
    val container = Container(
        Id = "1",
        Name = "Pourtainer",
        State = ContainerState(
            StartedAt = "",
            Status = "unknown"
        )
    )
    
    val logs = listOf(
        LogLine(UUID.randomUUID(), "Status update pending...")
    )

    ContainerView(container, logs)
}
