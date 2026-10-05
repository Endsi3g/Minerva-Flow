package com.minervaflow.loyalty

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import com.minervaflow.loyalty.ui.AppRoot
import com.minervaflow.loyalty.ui.AppViewModel
import com.minervaflow.loyalty.ui.theme.MinervaTheme

class MainActivity : ComponentActivity() {
    private val viewModel: AppViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MinervaTheme { AppRoot(viewModel) } }
    }
}
