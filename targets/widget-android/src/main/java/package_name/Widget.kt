package com.pourtainer.mobile

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
import expo.modules.widgetkit.Client
import expo.modules.widgetkit.ContainerSetting
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
    val rawContainers = state[PourtainerWidgetReceiver.containersKey] ?: "[]]"
    val containers =  Gson().fromJson(rawContainers, Array<ContainerSetting>::class.java) ?: emptyArray()
    val rawClient = state[PourtainerWidgetReceiver.clientKey] ?: "null"
    val client = Gson().fromJson(rawClient, Client::class.java) ?: null
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

        if (containers.isEmpty()) {
            NoContainersView(context)
            return@Column
        }

        // list is not empty and user selected container
        val rawContainer = state[PourtainerWidgetReceiver.selectedContainerKey] ?: "null"
        val container = Gson().fromJson(rawContainer, ContainerSetting::class.java)
        val rawContainerDetails = state[PourtainerWidgetReceiver.containerMetadataKey] ?: "null"
        val containerDetails = Gson().fromJson(rawContainerDetails, Container::class.java)

        ContainerView(container, containerDetails?.state?.status ?: "unknown")
    }
}

class PourtainerWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = PourtainerWidget()

    companion object {
        const val sharedPreferencesGroup = "group.com.pourtainer.mobile"
        val selectedContainerKey = stringPreferencesKey("selectedContainer")
        val clientKey = stringPreferencesKey("client")
        val containersKey = stringPreferencesKey("containers")
        val containerMetadataKey = stringPreferencesKey("containerMetadata")
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
                        val container = Gson().fromJson(rawContainer, ContainerSetting::class.java)

                        if (container != null) {
                            schedulePeriodicWork(context, glanceId, container)
                        }

                        prefs.toMutablePreferences().apply {
                            this[clientKey] = sharedPrefs.getString("client", "null").toString()
                            this[containersKey] = sharedPrefs.getString("containers", "[]").toString()
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

    private fun schedulePeriodicWork(context: Context, glanceId: GlanceId, container: ContainerSetting) {
        val workManager = WorkManager.getInstance(context)

        // cancel previous jobs if present
        workManager.cancelUniqueWork("widget_update_${glanceId.hashCode()}")

        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val work = PeriodicWorkRequestBuilder<WidgetDataWorker>(15, TimeUnit.MINUTES)
            .setInputData(workDataOf(
                WidgetDataWorker.containerIdKey to container.id
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
