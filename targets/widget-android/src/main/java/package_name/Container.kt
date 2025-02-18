package com.pourtainer.mobile

import com.google.gson.annotations.SerializedName

data class ContainerState(
    @SerializedName("StartedAt")
    val startedAt: String,
    @SerializedName("Status")
    val status: String
)

data class Container(
    @SerializedName("Id")
    val id: String,
    @SerializedName("Name")
    val name: String,
    @SerializedName("State")
    val state: ContainerState
)
