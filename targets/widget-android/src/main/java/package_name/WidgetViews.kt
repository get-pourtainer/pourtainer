package com.pourtainer.mobile

import Container
import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.clickable
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.size
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle
import androidx.glance.background
import androidx.glance.appwidget.cornerRadius
import androidx.glance.layout.Alignment
import androidx.glance.layout.Row
import androidx.core.net.toUri

@Composable
fun StatusView(title: String, description: String, context: Context) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(8.dp)
            .clickable(actionStartActivity(Intent(context, MainActivity::class.java)))
    ) {
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
            style = TextStyle(
                color = GlanceTheme.colors.onSurface
            ),
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
            style = TextStyle(
                fontSize = 12.sp,
                color = GlanceTheme.colors.onSurface
            ),
            modifier = GlanceModifier.padding(start = 4.dp)
        )
    }
}

@Composable
fun ContainerView(container: Container) {
    val customUri = "pourtainer://container/${container.Id}"
    val intent = Intent(Intent.ACTION_VIEW, customUri.toUri())

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(2.dp)
            .clickable(actionStartActivity(intent))
    ) {
        ContainerStatusView(container.State.Status)
        Text(
            text = container.Name,
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = GlanceTheme.colors.onSurface
            ),
            maxLines = 3
        )
    }
}
