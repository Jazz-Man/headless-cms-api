import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { Logger, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { createCache, KeyvAdapter } from 'cache-manager'
import { redisStore } from 'cache-manager-redis-yet'
import Keyv from 'keyv'

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (config: ConfigService) => {
        const ttl = config.get<number>('CACHE_TTL', 300) * 1000

        try {
          const store = await redisStore({
            socket: {
              host: config.get('REDIS_HOST', 'localhost'),
              port: config.get<number>('REDIS_PORT', 16379),
            },
          })
          const adapter = new KeyvAdapter(store)
          return { stores: [new Keyv({ store: adapter })], ttl }
        } catch {
          Logger.warn(
            'Redis unavailable — falling back to in-memory cache',
            'CacheModule',
          )
          return { stores: [new Keyv()], ttl }
        }
      },
    }),
  ],
})
export class CacheModule {}
