package com.kaz.appfactory

import android.app.Application
import com.kaz.appfactory.data.local.KazDatabase
import com.kaz.appfactory.data.local.ThemePreferenceManager
import com.kaz.appfactory.data.repository.ChatRepository

class KazApplication : Application() {

    lateinit var database: KazDatabase
        private set

    lateinit var chatRepository: ChatRepository
        private set

    lateinit var themePreferences: ThemePreferenceManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        database = KazDatabase.getInstance(this)
        chatRepository = ChatRepository(
            conversationDao = database.conversationDao(),
            chatMessageDao = database.chatMessageDao()
        )
        themePreferences = ThemePreferenceManager(this)
    }

    companion object {
        lateinit var instance: KazApplication
            private set
    }
}
