import { Injectable } from '@nestjs/common'
import { HealthCheckError, type HealthIndicatorResult } from '@nestjs/terminus'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource } from 'typeorm'

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async checkDb(): Promise<HealthIndicatorResult> {
    try {
      await this.dataSource.query('SELECT 1')
      return { database: { status: 'up' } }
    } catch (error) {
      throw new HealthCheckError('Database check failed', error)
    }
  }
}
