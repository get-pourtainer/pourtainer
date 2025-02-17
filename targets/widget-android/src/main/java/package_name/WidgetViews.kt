package com.pourtainer.mobile

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.Button
import androidx.glance.GlanceModifier
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.layout.fillMaxWidth
import androidx.glance.text.Text
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.layout.Column

@Composable
fun UnauthorizedView(context: Context) {
    Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "Unauthorized",
            modifier = GlanceModifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Sign in with Pourtainer app",
            modifier = GlanceModifier.padding(bottom = 16.dp)
        )
        Button(
            text = "Open Pourtainer App",
            onClick = actionStartActivity(Intent(context, MainActivity::class.java)),
            modifier = GlanceModifier.fillMaxWidth()
        )
    }
}

@Composable
fun NoContainersView(context: Context) {
    Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "No containers",
            modifier = GlanceModifier.padding(bottom = 8.dp)
        )
        Text(
            text = "Add your first container in Pourtainer app",
            modifier = GlanceModifier.padding(bottom = 16.dp)
        )
        Button(
            text = "Open Pourtainer App",
            onClick = actionStartActivity(Intent(context, MainActivity::class.java)),
            modifier = GlanceModifier.fillMaxWidth()
        )
    }
}
