package com.kaz.appfactory.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.kaz.appfactory.data.local.dao.ChatMessageDao
import com.kaz.appfactory.data.local.dao.ConversationDao
import com.kaz.appfactory.data.local.entities.ChatMessageEntity
import com.kaz.appfactory.data.local.entities.ConversationEntity

@Database(
    entities = [ConversationEntity::class, ChatMessageEntity::class],
    version = 1,
    exportSchema = false
)
abstract class KazDatabase : RoomDatabase() {

    abstract fun conversationDao(): ConversationDao
    abstract fun chatMessageDao(): ChatMessageDao

    companion object {
        @Volatile
        private var INSTANCE: KazDatabase? = null

        fun getInstance(context: Context): KazDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    KazDatabase::class.java,
                    "kaz_app_factory.db"
                ).fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
