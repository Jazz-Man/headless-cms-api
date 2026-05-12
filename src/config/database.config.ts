import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DataSource, DataSourceOptions } from 'typeorm'

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'headless_cms',
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.DB_LOGGING === 'true',
  }),
)

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'headless_cms',
  entities: ['dist/entities/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
}

export default new DataSource(dataSourceOptions)
