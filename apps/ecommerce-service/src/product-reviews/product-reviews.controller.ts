import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { Public } from '@app/common/decorators/public.decorator';
import { Roles } from '@app/common/decorators/roles.decorator';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@app/common/guards/jwt-auth.guard';
import { RolesGuard } from '@app/common/guards/roles.guard';
import type { AuthenticatedUser } from '@app/common/types/authenticated-user.type';

import { CurrentCustomer } from '../customer-auth/decorators/current-customer.decorator';
import { CustomerJwtAuthGuard } from '../customer-auth/guards/customer-jwt.guard';
import { OptionalCustomerJwtAuthGuard } from '../customer-auth/guards/optional-customer-jwt.guard';
import type { AuthenticatedCustomer } from '../customer-auth/types/authenticated-customer.type';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { ListProductReviewsAdminQueryDto } from './dto/list-product-reviews-admin-query.dto';
import { ModerateProductReviewDto } from './dto/moderate-product-review.dto';
import { ProductReviewsService } from './product-reviews.service';

@ApiTags('Ecommerce Product Reviews')
@Controller('ecommerce/products')
export class ProductReviewsController {
  constructor(private readonly productReviewsService: ProductReviewsService) {}

  @Get(':productId/reviews')
  @Public()
  @UseGuards(OptionalCustomerJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({ summary: 'Listar reseñas públicas de un producto' })
  getProductReviews(
    @Param('productId') productId: string,
    @Req() request: { user?: AuthenticatedCustomer | null },
  ) {
    return this.productReviewsService.getProductReviews(
      productId,
      request.user ?? undefined,
    );
  }

  @Post(':productId/reviews')
  @ApiBearerAuth()
  @UseGuards(CustomerJwtAuthGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Crear reseña (cliente autenticado y comprador verificado)' })
  createProductReview(
    @Param('productId') productId: string,
    @CurrentCustomer() customer: AuthenticatedCustomer,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.productReviewsService.createProductReview(productId, customer, dto);
  }
}

@ApiTags('Ecommerce Product Reviews Admin')
@Controller('ecommerce/reviews/admin')
export class ProductReviewsAdminController {
  constructor(private readonly productReviewsService: ProductReviewsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Listar reseñas para moderación' })
  listReviews(@Query() query: ListProductReviewsAdminQueryDto) {
    return this.productReviewsService.listAdminReviews(query);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin', 'Super Admin')
  @ApiOperation({ summary: 'Aprobar o rechazar reseña' })
  moderateReview(
    @Param('id') id: string,
    @Body() dto: ModerateProductReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productReviewsService.moderateReview(id, dto, user.id);
  }
}
