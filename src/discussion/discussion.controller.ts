import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { DiscussionService } from './discussion.service';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ReturnMessagePageDto } from './dto/return-message-page.dto';
import { ReturnMessageDto } from './dto/return-message.dto';
import { ReturnDiscussionRoomListDto } from './dto/return-discussion-room-list.dto';
import { ReturnRoomReadStatusDto } from './dto/return-room-read-status.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { Role } from '@prisma/client';
import { GetRoomsQueryDto } from './dto/get-rooms-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('discussion-rooms')
@UseGuards(JwtAccessGuard, RolesGuard)
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @Get('created-rooms')
  @Roles(Role.ORGANIZER)
  async getCreatedRooms(
    @Query() query: GetRoomsQueryDto,
    @Req() req: Request,
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.discussionService.getCreatedDiscussionRooms(
      user.organizerProfileId!,
      query.filter,
    );
  }

  @Get('joined-rooms')
  @Roles(Role.PARTICIPANT)
  async getJoinedRooms(
    @Query() query: GetRoomsQueryDto,
    @Req() req: Request,
  ): Promise<ReturnDiscussionRoomListDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.discussionService.getJoinedDiscussionRooms(
      user.participantProfileId!,
      query.filter,
    );
  }

  @Get(':roomId/messages')
  async getMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetMessagesQueryDto,
    @Req() req: Request,
  ): Promise<ReturnMessagePageDto> {
    const user = req.user as JwtAccessPayload;
    return this.discussionService.getMessages(
      roomId,
      query,
      user.currentRole!,
      user.currentRole === Role.PARTICIPANT ? user.participantProfileId! : null,
      user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
    );
  }

  @Get(':roomId/announcements')
  async getAnnouncements(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() req: Request,
  ): Promise<ReturnMessageDto[]> {
    const user = req.user as JwtAccessPayload;
    return this.discussionService.getAnnouncements(
      roomId,
      user.currentRole!,
      user.currentRole === Role.PARTICIPANT ? user.participantProfileId! : null,
      user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
    );
  }

  @Patch(':roomId/read')
  async markAsRead(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Req() req: Request,
  ): Promise<ReturnRoomReadStatusDto> {
    const user = req.user as JwtAccessPayload;
    return this.discussionService.markRoomAsRead(
      roomId,
      user.currentRole!,
      user.currentRole === Role.PARTICIPANT ? user.participantProfileId! : null,
      user.currentRole === Role.ORGANIZER ? user.organizerProfileId! : null,
    );
  }
}
