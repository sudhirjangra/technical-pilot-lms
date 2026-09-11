import { Permissions, Roles, User } from '@/common/decorators';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  RequestCashConversionDto,
  UpdateConversionStatusDto,
  UpdateReferralSettingsDto,
  ValidateCouponDto,
} from './dto/referral.dto';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth()
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ---------------- STUDENT ENDPOINTS ----------------

  @ApiOperation({
    summary:
      'Get current student referral code, wallet, referred users, and payout history',
  })
  @Get('my-summary')
  async getMySummary(@User('id') userId: string) {
    return this.referralsService.getMyReferralSummary(userId);
  }

  @ApiOperation({ summary: 'Request cash conversion of earned points to INR' })
  @Post('request-conversion')
  async requestCashConversion(
    @User('id') userId: string,
    @Body() dto: RequestCashConversionDto,
  ) {
    return this.referralsService.requestCashConversion(userId, dto);
  }

  @ApiOperation({
    summary: 'Validate coupon or referral discount code for a course',
  })
  @Post('validate-coupon')
  async validateCoupon(
    @User('id') userId: string,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.referralsService.validateCoupon(
      dto.code,
      userId,
      dto.course_id,
    );
  }

  // ---------------- ADMIN ENDPOINTS ----------------

  @ApiOperation({ summary: 'Get admin referral overview KPIs' })
  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('referrals:read')
  @Get('admin/overview')
  async getAdminOverview() {
    return this.referralsService.getAdminOverview();
  }

  @ApiOperation({ summary: 'Get list of all referral relationships' })
  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('referrals:read')
  @Get('admin/list')
  async getAdminReferrals(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.referralsService.getAdminReferrals(pageNum, limitNum);
  }

  @ApiOperation({ summary: 'Get list of cash conversion requests' })
  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('referrals:read')
  @Get('admin/conversion-requests')
  async getAdminConversionRequests(@Query('status') status?: string) {
    return this.referralsService.getAdminConversionRequests(status);
  }

  @ApiOperation({
    summary: 'Update cash conversion request (mark paid or reject)',
  })
  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('referrals:manage')
  @Patch('admin/conversion-requests/:id')
  async updateConversionStatus(
    @Param('id') requestId: string,
    @Body() dto: UpdateConversionStatusDto,
    @User('id') adminId: string,
  ) {
    return this.referralsService.updateConversionRequestStatus(
      requestId,
      dto,
      adminId,
    );
  }

  @ApiOperation({ summary: 'Get referral program settings' })
  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('referrals:read')
  @Get('admin/settings')
  async getSettings() {
    return this.referralsService.getSettings();
  }

  @ApiOperation({ summary: 'Update referral program settings (admin only)' })
  @Roles('ADMIN')
  @Patch('admin/settings')
  async updateSettings(
    @Body() dto: UpdateReferralSettingsDto,
    @User('id') adminId: string,
  ) {
    return this.referralsService.updateSettings(dto, adminId);
  }
}
