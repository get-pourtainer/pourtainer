package com.pourtainer.mobile

import Container
import ContainerState
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
    val state = currentState<Preferences>()

    val rawWidgetState = state[PourtainerWidgetReceiver.widgetStateKey] ?: "null"
    val widgetState =  Gson().fromJson(rawWidgetState, WidgetIntentState::class.java) ?: WidgetIntentState.LOADING
    val rawInstances = state[PourtainerWidgetReceiver.instancesKey] ?: "[]"
    val instances = Gson().fromJson(rawInstances, Array<Instance>::class.java) ?: emptyArray()
    val isAuthorized = instances.isNotEmpty()

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .background(GlanceTheme.colors.background)
    ) {
        if (!isAuthorized) {
            StatusView("Unauthorized", "Sign in with Pourtainer app", context)
            return@Column
        }

        if (widgetState == WidgetIntentState.NO_CONTAINERS) {
            StatusView("No containers", "Add your first container to show it here", context)
            return@Column
        }

        if (widgetState == WidgetIntentState.API_FAILED) {
            StatusView("Api error", "We couldn't fetch data from api", context)
            return@Column
        }

        // list is not empty and user selected container
        val rawContainerDetails = state[PourtainerWidgetReceiver.containerMetadataKey] ?: "null"
        val containerDetails = Gson().fromJson(rawContainerDetails, Container::class.java)

        ContainerView(containerDetails)
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

    ContainerView(container)
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

    ContainerView(container)
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

    ContainerView(container)
}
