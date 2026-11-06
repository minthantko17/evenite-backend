import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, TicketStatus } from '@prisma/client';

@Injectable()
export class EventSchedulerService {
  private readonly logger = new Logger(EventSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async updateEventStatuses(): Promise<void> {
    const now = new Date();

    // ONGOING if PUBLISHED + startAt passed + endAt not yet passed (or maybe no endat)
    const ongoingResult = await this.prisma.event.updateMany({
      where: {
        status: EventStatus.PUBLISHED,
        startAt: { lte: now },
        OR: [{ endAt: { gt: now } }, { endAt: null }],
      },
      data: { status: EventStatus.ONGOING },
    });

    // CONCLUDED if PUBLISHED/ONGOING + endAt passed
    const concludedResult = await this.prisma.event.updateMany({
      where: {
        status: { in: [EventStatus.PUBLISHED, EventStatus.ONGOING] },
        endAt: { lte: now },
      },
      data: { status: EventStatus.CONCLUDED },
    });

    // expire ACTIVE tickets for CONCLUDED events
    const expiredTicketsResult = await this.prisma.ticket.updateMany({
      where: {
        status: TicketStatus.ACTIVE,
        eventRegistration: {
          event: {
            OR: [
              {
                status: EventStatus.CONCLUDED,
                endAt: { lte: now },
              },
              {
                status: EventStatus.CONCLUDED,
                endAt: null,
                startAt: { lte: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
              },
            ],
          },
        },
      },
      data: { status: TicketStatus.EXPIRED },
    });

    if (expiredTicketsResult.count > 0) {
      this.logger.log(
        `Auto-expired ${expiredTicketsResult.count} tickets for concluded events`,
      );
    }

    if (ongoingResult.count > 0) {
      this.logger.log(`Auto-updated ${ongoingResult.count} events to ONGOING`);
    }
    if (concludedResult.count > 0) {
      this.logger.log(
        `Auto-updated ${concludedResult.count} events to CONCLUDED`,
      );
    }
  }
}
