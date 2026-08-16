package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val GeometricColorScheme = darkColorScheme(
    primary = GeometricAccentLight,
    onPrimary = GeometricAccentText,
    primaryContainer = GeometricAccentDark,
    onPrimaryContainer = GeometricAccentLight,
    secondary = GeometricAccentDark,
    onSecondary = GeometricTextPrimary,
    secondaryContainer = GeometricSurface,
    onSecondaryContainer = GeometricTextPrimary,
    background = GeometricBackground,
    onBackground = GeometricTextPrimary,
    surface = GeometricSurface,
    onSurface = GeometricTextPrimary,
    surfaceVariant = GeometricSurface,
    onSurfaceVariant = GeometricTextSecondary,
    outline = GeometricBorder,
)

@Composable
fun MyApplicationTheme(
    darkTheme: Boolean = true, // Force dark theme for Geometric Balance
    dynamicColor: Boolean = false, // Disable dynamic color to enforce our palette
    content: @Composable () -> Unit,
) {
    MaterialTheme(colorScheme = GeometricColorScheme, typography = Typography, content = content)
}
