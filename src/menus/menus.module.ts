import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Menu } from '../entities/menu.entity'
import { MenuItem } from '../entities/menu-item.entity'
import { MenuItemsController } from './menu-items/menu-items.controller'
import { MenuItemsService } from './menu-items/menu-items.service'
import { MenusController } from './menus.controller'
import { MenusService } from './menus.service'

@Module({
  controllers: [MenusController, MenuItemsController],
  exports: [MenusService],
  imports: [TypeOrmModule.forFeature([Menu, MenuItem])],
  providers: [MenusService, MenuItemsService],
})
export class MenusModule {}
