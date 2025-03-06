package com.pourtainer.mobile

import Container
import LogLine
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
import androidx.glance.layout.Spacer
import androidx.glance.layout.height
import androidx.core.net.toUri
import androidx.glance.LocalSize
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.DpSize

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
fun LogLineView(log: LogLine) {
    Text(
        text = log.content,
        style = TextStyle(
            fontSize = 12.sp,
            color = GlanceTheme.colors.onSurface
        ),
        maxLines = 2
    )
}

@Composable
fun ContainerView(container: Container?, logs: List<LogLine> = emptyList()) {
    // Check if container exists
    if (container == null) {
        StatusView("Container not found", "Configure your widget and select new container", LocalContext.current)
        return
    }
    
    val maxLogLines = 20
    
    // Determine visible log lines based on widget size
    val visibleLogLines = if (logs.isNotEmpty()) {
        logs.takeLast(maxLogLines)
    } else {
        emptyList()
    }
	
    // Create deeplink intent (container ID already cleaned in data worker)
    val customUri = "pourtainer://container/${container.id}?connectionId=${container.connection.id}&endpointId=${container.endpoint.Id}"
    val intent = Intent(Intent.ACTION_VIEW, customUri.toUri())
    
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(8.dp)
            .clickable(actionStartActivity(intent))
    ) {
        // Container status indicator (running, exited, etc.)
        ContainerStatusView(container.state)
        
        // Container name with truncation for long names
        Text(
            text = container.name,
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = GlanceTheme.colors.onSurface
            ),
            maxLines = 1
        )
		
		// widget size
		//   Text(
        //     	text = "${LocalSize.current.width}x${LocalSize.current.height}",
        //     style = TextStyle(
        //         fontWeight = FontWeight.Bold,
        //         fontSize = 12.sp,
        //         color = GlanceTheme.colors.onSurface
        //     ),
        //     maxLines = 1
        // )
        
        // Add some space before showing logs
        if (logs.isNotEmpty() && LocalSize.current.height > 56.dp) {
            Spacer(modifier = GlanceModifier.height(4.dp))
            
            // Display log lines
            Column(
                modifier = GlanceModifier.padding(top = 2.dp)
            ) {
                logs.forEach { logLine ->
                    LogLineView(logLine)
                }
            }
        }
    }
}
