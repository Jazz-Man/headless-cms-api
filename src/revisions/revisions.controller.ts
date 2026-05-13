import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import { RevisionsService } from './revisions.service'

@Controller('contents')
export class RevisionsController {
  constructor(private readonly service: RevisionsService) {}

  @Get(':contentId/revisions')
  findByContent(
    @Param('contentId') contentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByContent(
      contentId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    )
  }

  @Get(':contentId/revisions/:revisionNumber')
  findOne(
    @Param('contentId') contentId: string,
    @Param('revisionNumber') revisionNumber: string,
  ) {
    return this.service.findOne(contentId, parseInt(revisionNumber, 10))
  }

  @Post(':contentId/revisions/:revisionNumber/restore')
  restore(
    @Param('contentId') contentId: string,
    @Param('revisionNumber') revisionNumber: string,
    // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard, TS1272 requires no type annotation
    @Req() req: any,
  ) {
    return this.service.restore(
      contentId,
      parseInt(revisionNumber, 10),
      req.user.id,
    )
  }
}
