import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Permissions } from '../common/decorators/permissions.decorator'
import { Public } from '../common/decorators/public.decorator'
import { MediaService } from './media.service'

@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findAll(
      page ? Number.parseInt(page, 10) : undefined,
      limit ? Number.parseInt(limit, 10) : undefined,
    )
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Permissions('media:upload')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard, TS1272 requires no type annotation
  upload(@UploadedFile() file: any, @Req() req: any) {
    return this.service.upload(
      file.buffer,
      file.originalname,
      file.mimetype,
      req.user?.id,
    )
  }

  @Permissions('media:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
