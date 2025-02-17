package com.pourtainer.mobile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import expo.modules.widgetkit.ContainerSetting

@Composable
fun WidgetConfigurationView(
    containers: Array<ContainerSetting>,
    onContainerSelected: (ContainerSetting) -> Unit,
    onDone: () -> Unit
) {
    var selectedContainer by remember { mutableStateOf<ContainerSetting?>(null) }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Select a Docker Container", style = MaterialTheme.typography.titleLarge)

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(modifier = Modifier.weight(1f)) {
            items(containers) { container ->
                ContainerItem(
                    container = container,
                    isSelected = container == selectedContainer,
                    onSelect = {
                        selectedContainer = container
                        onContainerSelected(container)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onDone,
            enabled = selectedContainer != null,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Done")
        }
    }
}

@Composable
fun ContainerItem(
    container: ContainerSetting,
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
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface
        )
    ) {
        Text(
            text = container.name,
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyLarge
        )
    }
}
