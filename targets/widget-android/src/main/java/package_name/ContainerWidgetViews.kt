package com.pourtainer.mobile

import ContainerMetadata
import LogLine
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.net.toUri
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.LocalSize
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle

@Composable
fun StatusView(title: String, description: String, onClick: Action? = null) {
    val base = GlanceModifier.fillMaxSize().padding(8.dp)

    Column(modifier = if (onClick != null) base.clickable(onClick) else base) {
        Text(
            text = title,
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = GlanceTheme.colors.onSurface
            ),
            modifier = GlanceModifier.padding(bottom = 8.dp)
        )
        Text(
            text = description,
            style = TextStyle(color = GlanceTheme.colors.onSurface),
            modifier = GlanceModifier.padding(bottom = 4.dp)
        )
    }
}

@Composable
fun ContainerStatusView(status: String) {
    val containerStatus = status.replaceFirstChar { it.titlecase() }
    val statusColor = when (status) {
        "running" -> successColor
        "exited" -> errorColor
        else -> warningColor
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = GlanceModifier.padding(bottom = 8.dp)
    ) {
        Box(
            modifier = GlanceModifier
                .size(6.dp)
                .cornerRadius(6.dp)
                .background(statusColor)
        ) {}
        Text(
            text = containerStatus,
            style = TextStyle(fontSize = 12.sp, color = GlanceTheme.colors.onSurface),
            modifier = GlanceModifier.padding(start = 4.dp)
        )
    }
}

@Composable
fun LogLineView(log: LogLine) {
    Text(
        text = log.content,
        style = TextStyle(fontSize = 12.sp, color = GlanceTheme.colors.onSurface),
        maxLines = 2
    )
}

@Composable
fun ContainerView(container: ContainerMetadata, logs: List<LogLine> = emptyList()) {
    // Same deep link the iOS widget uses; WidgetSyncer switches connection + endpoint
    val customUri =
        "pourtainer://container/${container.id}?connectionId=${container.connectionId}&endpointId=${container.endpoint.Id}"
    val openContainer = actionStartActivity(Intent(Intent.ACTION_VIEW, customUri.toUri()))

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(8.dp)
            .clickable(openContainer)
    ) {
        ContainerStatusView(container.state)

        Text(
            text = container.name,
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = GlanceTheme.colors.onSurface
            ),
            maxLines = 1
        )

        if (logs.isNotEmpty() && LocalSize.current.height > 56.dp) {
            Spacer(modifier = GlanceModifier.height(4.dp))

            Column(modifier = GlanceModifier.padding(top = 2.dp)) {
                logs.forEach { logLine ->
                    LogLineView(logLine)
                }
            }
        }
    }
}
