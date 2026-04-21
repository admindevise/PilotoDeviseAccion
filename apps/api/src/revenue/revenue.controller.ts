import { Controller, Get, Query } from '@nestjs/common';
import { RevenueService } from './revenue.service';

@Controller('revenue')
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('opportunities')
  getOpportunities(
    @Query('fideicomisoId') fideicomisoId?: string,
    @Query('subcategoria') subcategoria?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.revenueService.getOpportunities({
      fideicomisoId,
      subcategoria,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('summary')
  getSummary() {
    return this.revenueService.getSummary();
  }
}
