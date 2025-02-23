package com.pourtainer.mobile

import Container
import ContainerListItem
import Endpoint
import WidgetIntentState
import android.content.Context
import android.content.Intent
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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import androidx.datastore.preferences.core.Preferences
import androidx.glance.currentState
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import expo.modules.widgetkit.Instance
import savedInstancesKey
import savedWidgetStateKey
import java.util.concurrent.TimeUnit

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
            UnauthorizedView(context)
            return@Column
        }

        if (widgetState == WidgetIntentState.NO_CONTAINERS) {
            NoContainersView(context)
            return@Column
        }

        // list is not empty and user selected container
        val rawContainer = state[PourtainerWidgetReceiver.selectedContainerKey] ?: "null"
        val container = Gson().fromJson(rawContainer, ContainerListItem::class.java)
        val rawContainerDetails = state[PourtainerWidgetReceiver.containerMetadataKey] ?: "null"
        val containerDetails = Gson().fromJson(rawContainerDetails, Container::class.java)

        ContainerView(container, containerDetails.State.Status)
    }
}

class PourtainerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PourtainerWidget()

    companion object {
        const val sharedPreferencesGroup = "group.com.pourtainer.mobile"
        val selectedContainerKey = stringPreferencesKey("selectedContainer")
        val widgetStateKey = stringPreferencesKey("state")
        val containerMetadataKey = stringPreferencesKey("containerMetadata")
        val instancesKey = stringPreferencesKey("instances")
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == "android.appwidget.action.APPWIDGET_UPDATE") {
            CoroutineScope(Dispatchers.IO).launch {
                val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(PourtainerWidget::class.java)
                val sharedPrefs = context.getSharedPreferences(sharedPreferencesGroup, Context.MODE_PRIVATE)

                glanceIds.forEach { glanceId ->
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        val rawContainer = prefs[selectedContainerKey] ?: "null"
                        val container = Gson().fromJson(rawContainer, ContainerListItem::class.java)

                        if (container != null) {
                            schedulePeriodicWork(context, glanceId, container)
                        }

                        prefs.toMutablePreferences().apply {
                            this[instancesKey] = sharedPrefs.getString(savedInstancesKey, "null").toString()
                            this[widgetStateKey] = sharedPrefs.getInt(savedWidgetStateKey, WidgetIntentState.LOADING.value).toString()
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                }
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)

        appWidgetIds.forEach { appWidgetId ->
            val glanceId = GlanceAppWidgetManager(context).getGlanceIdBy(appWidgetId)
            val workManager = WorkManager.getInstance(context)

            // widget should no longer get periodic updates
            workManager.cancelUniqueWork("widget_update_${glanceId.hashCode()}")
        }
    }

    fun onContainerSelected(context: Context, glanceId: GlanceId, container: ContainerListItem?) {
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
                            this[selectedContainerKey] = Gson().toJson(container)
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                    schedulePeriodicWork(context, glanceId, container)
                }
            }
        }
    }

    fun onStatusUpdated(context: Context, glanceId: GlanceId, container: Container) {
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
                            this[containerMetadataKey] = Gson().toJson(container)
                        }
                    }

                    glanceAppWidget.update(context, glanceId)
                }
            }
        }
    }

    private fun schedulePeriodicWork(context: Context, glanceId: GlanceId, container: ContainerListItem) {
        val workManager = WorkManager.getInstance(context)

        // cancel previous jobs if present
        workManager.cancelUniqueWork("widget_update_${glanceId.hashCode()}")

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val work = PeriodicWorkRequestBuilder<WidgetDataWorker>(15, TimeUnit.MINUTES)
            .setInputData(workDataOf(
                WidgetDataWorker.containerKey to Gson().toJson(container),
                WidgetDataWorker.glanceIdKey to glanceId.hashCode().toString()
            ))
            .setConstraints(constraints)
            .build()

        workManager.enqueueUniquePeriodicWork(
            "widget_update_${glanceId.hashCode()}",
            ExistingPeriodicWorkPolicy.UPDATE,
            work
        )
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
    val container = ContainerListItem(
        id = "1",
        containerName = "Pourtainer",
        endpoint = Endpoint(1),
        instance = Instance()
    )

    ContainerView(container, "running")
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview4() {
    val container = ContainerListItem(
        id = "1",
        containerName = "Pourtainer",
        endpoint = Endpoint(1),
        instance = Instance()
    )

    ContainerView(container, "exited")
}

@OptIn(ExperimentalGlancePreviewApi::class)
@Preview(widthDp = 200, heightDp = 160)
@Composable
fun ContentPreview5() {
    val container = ContainerListItem(
        id = "1",
        containerName = "Pourtainer",
        endpoint = Endpoint(1),
        instance = Instance()
    )

    ContainerView(container, "unknown")
}
