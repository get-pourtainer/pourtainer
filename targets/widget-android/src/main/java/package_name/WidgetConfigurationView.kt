package com.pourtainer.mobile

import ContainerListItem
import WidgetIntentState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun WidgetConfigurationView(
    isAuthorized: Boolean,
    state: WidgetIntentState,
    selectedContainer: ContainerListItem?,
    containers: List<ContainerListItem>,
    onContainerSelected: (ContainerListItem) -> Unit,
    onDone: () -> Unit,
    openApp: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        if (!isAuthorized) {
            SettingsView("Unauthorized", "Sign in with Pourtainer app", openApp)
            return@Column
        }

        if (state == WidgetIntentState.LOADING) {
            SettingsView("Loading...", "We're fetching your container details")
            return@Column
        }

        if (state == WidgetIntentState.API_FAILED) {
            SettingsView("Api error", "We couldn't fetch data from api", openApp)
            return@Column
        }

        if (state == WidgetIntentState.NO_CONTAINERS) {
            SettingsView("No containers", "Add your first container in Pourtainer app", openApp)
            return@Column
        }

        Text("Select container", style = MaterialTheme.typography.titleLarge)
        Spacer(modifier = Modifier.height(16.dp))
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(containers) { container ->
                ContainerItem(
                    container = container,
                    isSelected = container == selectedContainer,
                    onSelect = {
                        onContainerSelected(container)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onDone,
            enabled = selectedContainer != null,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonColors(
                containerColor = buttonColor,
                contentColor = whiteColor,
                disabledContainerColor = buttonInactiveColor,
                disabledContentColor = whiteColor
            )
        ) {
            Text(
                text = "Done",
                color = whiteColor
            )
        }
    }
}

@Composable
fun ContainerItem(
    container: ContainerListItem,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable { onSelect() },
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) buttonInactiveColor else MaterialTheme.colorScheme.surface
        )
    ) {
        Text(
            text = container.containerName,
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyLarge,
            color = if (isSelected) whiteColor else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun SettingsView(title: String, description: String, openApp: (() -> Unit)? = null) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        Text(
            text = description,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        if (openApp != null) {
            Button(
                onClick = openApp,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonColors(
                    containerColor = buttonColor,
                    contentColor = whiteColor,
                    disabledContainerColor = buttonInactiveColor,
                    disabledContentColor = whiteColor
                )
            ) {
                Text(
                    text = "Open Pourtainer App",
                    color = whiteColor
                )
            }
        }
    }
}
