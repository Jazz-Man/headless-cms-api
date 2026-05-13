import { Body, Controller, Param, Post, Req } from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { BulkService } from './bulk.service'
import { BulkContentsDto } from './dto/bulk-contents.dto'
import { BulkTermsDto } from './dto/bulk-terms.dto'

@Controller()
export class BulkController {
  constructor(private readonly bulkService: BulkService) {}

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post('contents/bulk')
  // biome-ignore lint/suspicious/noExplicitAny: req.user injected by guard, TS1272 requires no type annotation
  bulkContents(@Req() req: any, @Body() dto: BulkContentsDto) {
    return this.bulkService.bulkContents(req.user.id, req.user.role, dto)
  }

  @Roles(UserRole.ADMIN)
  @Post('taxonomies/:taxonomySlug/terms/bulk')
  bulkCreateTerms(
    @Param('taxonomySlug') taxonomySlug: string,
    @Body() dto: BulkTermsDto,
  ) {
    return this.bulkService.bulkCreateTerms(taxonomySlug, dto.items)
  }
}
