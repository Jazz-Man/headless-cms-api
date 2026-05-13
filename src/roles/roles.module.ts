import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Permission } from '../entities/permission.entity'
import { Role } from '../entities/role.entity'
import { RolesController } from './roles.controller'
import { RolesService } from './roles.service'

@Module({
  controllers: [RolesController],
  exports: [RolesService],
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  providers: [RolesService],
})
export class RolesModule {}
