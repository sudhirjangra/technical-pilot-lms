import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class RequestCashConversionDto {
  @ApiProperty({
    description: 'Number of points to convert to cash',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  points: number;

  @ApiProperty({
    description: 'Optional student notes or bank details preference',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateConversionStatusDto {
  @ApiProperty({
    description: 'Status to update request to',
    enum: ['paid', 'rejected'],
  })
  @IsIn(['paid', 'rejected'])
  status: 'paid' | 'rejected';

  @ApiProperty({
    description: 'Admin notes or reason for rejection',
    required: false,
  })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}

export class UpdateReferralSettingsDto {
  @ApiProperty({
    description: 'Discount percentage for referee on signup',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  referee_discount_percentage?: number;

  @ApiProperty({
    description: 'Reward percentage for referrer on course purchase',
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  referrer_reward_percentage?: number;

  @ApiProperty({
    description: 'Points per 1 Rupee conversion ratio',
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  points_per_rupee?: number;

  @ApiProperty({
    description: 'Minimum points needed to request cash conversion',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  min_withdrawal_points?: number;

  @ApiProperty({
    description: 'Whether referral system is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon or referral code to validate' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Course ID to apply coupon to' })
  @IsString()
  course_id: string;
}
