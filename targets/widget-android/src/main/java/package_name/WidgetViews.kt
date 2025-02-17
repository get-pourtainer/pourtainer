package com.pourtainer.mobile

import android.content.Context
import android.content.Intent
import android.net.Uri
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
import androidx.glance.layout.Column
import androidx.glance.text.FontWeight
import androidx.glance.text.TextStyle

@Composable
fun UnauthorizedView(context: Context) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .clickable(actionStartActivity(Intent(context, MainActivity::class.java)))
    ) {
        Text(
            text = "Unauthorized",
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = GlanceTheme.colors.onSurface
            ),
            modifier = GlanceModifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Sign in with\nPourtainer app",
            modifier = GlanceModifier.padding(bottom = 16.dp)
        )
    }
}

@Composable
fun NoContainersView(context: Context) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .clickable(actionStartActivity(Intent(context, MainActivity::class.java)))
    ) {
        Text(
            text = "No containers",
            style = TextStyle(
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = GlanceTheme.colors.onSurface
            ),
            modifier = GlanceModifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Add your first container in Pourtainer app",
            modifier = GlanceModifier.padding(bottom = 16.dp)
        )
    }
}

@Composable
fun ContainerView(context: Context, containerId: String?) {
    val customUri = "pourtainer://container/${containerId ?: ""}"
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(customUri))

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .clickable(actionStartActivity(intent))
    ) {
        Text(
            text = "Todo",
            modifier = GlanceModifier.padding(bottom = 16.dp)
        )
    }
}
