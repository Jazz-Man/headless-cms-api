import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { Public } from '../common/decorators/public.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { ContentsService } from './contents.service'
import { CreateContentDto } from './dto/create-content.dto'
import { QueryContentsDto } from './dto/query-contents.dto'
import { UpdateContentDto } from './dto/update-content.dto'

@Controller('contents')
export class ContentsController {
  constructor(private readonly service: ContentsService) {}

  @Public()
  @Get()
  findPublished(@Query() query: QueryContentsDto) {
    return this.service.findPublished(query)
  }

  @Public()
  @Get(':slug')
  findOneBySlug(@Param('slug') slug: string) {
    return this.service.findOneBySlug(slug)
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post()
  // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard, TS1272 requires no type annotation
  create(@Req() req: any, @Body() dto: CreateContentDto) {
    return this.service.create(req.user.id, dto)
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
    // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard, TS1272 requires no type annotation
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.id, req.user.role)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.service.archive(id)
  }
}
