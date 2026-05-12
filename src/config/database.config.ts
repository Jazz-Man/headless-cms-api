import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DataSource, DataSourceOptions } from 'typeorm'

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    autoLoadEntities: true,
    database: process.env.DB_DATABASE ?? 'headless_cms',
    host: process.env.DB_HOST ?? 'localhost',
    logging: process.env.DB_LOGGING === 'true',
    password: process.env.DB_PASSWORD ?? 'postgres',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    synchronize: process.env.NODE_ENV !== 'production',
    type: 'postgres',
    username: process.env.DB_USERNAME ?? 'postgres',
  }),
)

export const dataSourceOptions: DataSourceOptions = {
  database: process.env.DB_DATABASE ?? 'headless_cms',
  entities: ['dist/entities/*.entity.js'],
  host: process.env.DB_HOST ?? 'localhost',
  migrations: ['dist/migrations/*.js'],
  password: process.env.DB_PASSWORD ?? 'postgres',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  synchronize: false,
  type: 'postgres',
  username: process.env.DB_USERNAME ?? 'postgres',
}

export default new DataSource(dataSourceOptions)
