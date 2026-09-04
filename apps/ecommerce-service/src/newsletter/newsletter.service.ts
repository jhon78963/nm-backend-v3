import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '@app/database';

import { ListNewsletterSubscribersQueryDto } from './dto/list-newsletter-subscribers-query.dto';
import { SendNewsletterCampaignDto } from './dto/send-newsletter-campaign.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { NewsletterMailService } from './newsletter-mail.service';

@Injectable()
export class NewsletterService {
  constructor(
    private readonly db: DatabaseService,
    private readonly newsletterMail: NewsletterMailService,
  ) {}

  async subscribe(dto: SubscribeNewsletterDto) {
    const email = dto.email.trim().toLowerCase();
    const source = dto.source?.trim() || 'footer';

    const customer = await this.db.ecommerceCustomer.findUnique({
      where: { email },
      select: { id: true },
    });

    const existing = await this.db.ecommerceNewsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing?.status === 'active') {
      return {
        success: true,
        alreadySubscribed: true,
        message: 'Ya estás suscrito a nuestro boletín.',
      };
    }

    if (existing) {
      await this.db.ecommerceNewsletterSubscriber.update({
        where: { id: existing.id },
        data: {
          status: 'active',
          source,
          customerId: customer?.id ?? existing.customerId,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      });
    } else {
      await this.db.ecommerceNewsletterSubscriber.create({
        data: {
          email,
          source,
          customerId: customer?.id ?? null,
        },
      });
    }

    if (customer) {
      await this.db.ecommerceCustomerNotificationSetting.upsert({
        where: { customerId: customer.id },
        create: {
          customerId: customer.id,
          newsletter: true,
        },
        update: {
          newsletter: true,
        },
      });
    }

    this.newsletterMail.sendSubscriptionConfirmation(email);

    return {
      success: true,
      alreadySubscribed: false,
      message: '¡Gracias por suscribirte a nuestro boletín!',
    };
  }

  async listSubscribers(query: ListNewsletterSubscribersQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where = {
      ...(query.status && query.status !== 'all' ? { status: query.status } : {}),
      ...(query.search
        ? {
            email: { contains: query.search, mode: 'insensitive' as const },
          }
        : {}),
    };

    const [subscribers, total, activeCount] = await Promise.all([
      this.db.ecommerceNewsletterSubscriber.findMany({
        where,
        orderBy: { subscribedAt: 'desc' },
        skip,
        take: perPage,
        select: {
          id: true,
          email: true,
          status: true,
          source: true,
          subscribedAt: true,
          unsubscribedAt: true,
          customerId: true,
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.db.ecommerceNewsletterSubscriber.count({ where }),
      this.db.ecommerceNewsletterSubscriber.count({ where: { status: 'active' } }),
    ]);

    return {
      subscribers,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
        activeCount,
      },
    };
  }

  async unsubscribeSubscriber(id: string) {
    const subscriber = await this.db.ecommerceNewsletterSubscriber.findUnique({
      where: { id },
      select: { id: true, email: true, customerId: true, status: true },
    });

    if (!subscriber) {
      throw new NotFoundException('Suscriptor no encontrado.');
    }

    if (subscriber.status === 'unsubscribed') {
      return { success: true, subscriber };
    }

    const updated = await this.db.ecommerceNewsletterSubscriber.update({
      where: { id },
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        status: true,
        subscribedAt: true,
        unsubscribedAt: true,
        source: true,
        customerId: true,
      },
    });

    if (subscriber.customerId) {
      await this.db.ecommerceCustomerNotificationSetting.updateMany({
        where: { customerId: subscriber.customerId },
        data: { newsletter: false },
      });
    }

    return { success: true, subscriber: updated };
  }

  async listCampaigns() {
    const campaigns = await this.db.ecommerceNewsletterCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        subject: true,
        title: true,
        status: true,
        sentCount: true,
        failedCount: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return { campaigns };
  }

  async sendCampaign(dto: SendNewsletterCampaignDto) {
    const activeSubscribers = await this.db.ecommerceNewsletterSubscriber.findMany({
      where: { status: 'active' },
      select: { email: true },
      orderBy: { subscribedAt: 'asc' },
    });

    if (activeSubscribers.length === 0) {
      throw new BadRequestException('No hay suscriptores activos para enviar el boletín.');
    }

    const campaign = await this.db.ecommerceNewsletterCampaign.create({
      data: {
        subject: dto.subject.trim(),
        title: dto.title.trim(),
        body: dto.body.trim(),
        previewText: dto.previewText?.trim() || null,
        ctaUrl: dto.ctaUrl?.trim() || null,
        ctaLabel: dto.ctaLabel?.trim() || null,
        status: 'sending',
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of activeSubscribers) {
      const sent = await this.newsletterMail.sendCampaignEmail(subscriber.email, {
        subject: campaign.subject,
        title: campaign.title,
        body: campaign.body,
        previewText: campaign.previewText ?? undefined,
        ctaUrl: campaign.ctaUrl ?? undefined,
        ctaLabel: campaign.ctaLabel ?? undefined,
      });

      if (sent) {
        sentCount += 1;
      } else {
        failedCount += 1;
      }
    }

    const updatedCampaign = await this.db.ecommerceNewsletterCampaign.update({
      where: { id: campaign.id },
      data: {
        status: failedCount > 0 && sentCount === 0 ? 'failed' : 'sent',
        sentCount,
        failedCount,
        sentAt: new Date(),
      },
      select: {
        id: true,
        subject: true,
        title: true,
        status: true,
        sentCount: true,
        failedCount: true,
        sentAt: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      campaign: updatedCampaign,
      recipientCount: activeSubscribers.length,
    };
  }
}
