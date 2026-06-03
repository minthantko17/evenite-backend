import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { EventStatus, Role } from '@prisma/client';
import { UserService } from './user.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAccessPayload } from '../auth/strategies/jwt-access.strategy';
import { CreateParticipantProfileDto } from './dto/create-participant-profile.dto';
import { UpdateParticipantProfileDto } from './dto/update-participant-profile.dto';
import { CreateOrganizerProfileDto } from './dto/create-organizer-profile.dto';
import { UpdateOrganizerProfileDto } from './dto/update-organizer-profile.dto';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { ReturnUserDto } from './dto/return-user.dto';
import { ReturnParticipantProfileDto } from './dto/return-participant-profile.dto';
import { ReturnOrganizerProfileDto } from './dto/return-organizer-profile.dto';
import { ReturnSwitchProfileDto } from './dto/return-switch-profile.dto';
import { Event, EventRegistration } from '@prisma/client';
import { EventRegistrationWithEvent } from './services/user-crud.service';

@Controller('users')
@UseGuards(JwtAccessGuard, RolesGuard) // all endpoints require auth
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  getCurrentUserProfile(@Req() req: Request): Promise<ReturnUserDto> {
    const user = req.user as JwtAccessPayload;
    return this.userService.getUserProfile(user.sub);
  }

  @Patch('me/switch-profile')
  switchCurrentUserProfile(
    @Req() req: Request,
    @Body() dto: SwitchRoleDto,
  ): Promise<ReturnSwitchProfileDto> {
    const user = req.user as JwtAccessPayload;
    return this.userService.switchProfile(user.sub, dto);
  }

  // --- Participant Profile Endpoints ---

  @Get('me/participant-profile')
  @Roles(Role.PARTICIPANT)
  getCurrentUserParticipantProfile(
    @Req() req: Request,
  ): Promise<ReturnParticipantProfileDto> {
    const user = req.user as JwtAccessPayload;
    return this.userService.getParticipantProfile(user.sub);
  }

  @Post('me/participant-profile')
  createCurrentUserParticipantProfile(
    @Req() req: Request,
    @Body() dto: CreateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto & { accessToken: string }> {
    const user = req.user as JwtAccessPayload;
    return this.userService.createParticipantProfile(user.sub, dto);
  }

  @Patch('me/participant-profile')
  @Roles(Role.PARTICIPANT)
  updateCurrentUserParticipantProfile(
    @Req() req: Request,
    @Body() dto: UpdateParticipantProfileDto,
  ): Promise<ReturnParticipantProfileDto> {
    const user = req.user as JwtAccessPayload;
    return this.userService.updateParticipantProfile(user.sub, dto);
  }

  @Post('me/participant-profile/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadCurrentUserParticipantImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    return this.userService.uploadParticipantImage(file);
  }

  // TODO: refine in Feature #5
  @Get('me/registered-events')
  @Roles(Role.PARTICIPANT)
  getCurrentUserRegisteredEvents(
    @Req() req: Request,
  ): Promise<EventRegistrationWithEvent[]> {
    const user = req.user as JwtAccessPayload;
    return this.userService.getRegisteredEvents(user.sub);
  }

  // --- Organizer Profile Endpoints ----

  @Get('me/organizer-profile')
  @Roles(Role.ORGANIZER)
  getCurrentUserOrganizerProfile(
    @Req() req: Request,
  ): Promise<ReturnOrganizerProfileDto> {
    const user = req.user as JwtAccessPayload;
    return this.userService.getOrganizerProfile(user.sub);
  }

  @Post('me/organizer-profile')
  createCurrentUserOrganizerProfile(
    @Req() req: Request,
    @Body() dto: CreateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto & { accessToken: string }> {
    const user = req.user as JwtAccessPayload;
    return this.userService.createOrganizerProfile(user.sub, dto);
  }

  @Patch('me/organizer-profile')
  @Roles(Role.ORGANIZER)
  updateCurrentUserOrganizerProfile(
    @Req() req: Request,
    @Body() dto: UpdateOrganizerProfileDto,
  ): Promise<ReturnOrganizerProfileDto> {
    const user = req.user as JwtAccessPayload;
    return this.userService.updateOrganizerProfile(user.sub, dto);
  }

  @Post('me/organizer-profile/image')
  @UseInterceptors(FileInterceptor('image'))
  uploadCurrentUserOrganizerImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ imageUrl: string }> {
    return this.userService.uploadOrganizerImage(file);
  }

  @Get('me/created-events')
  @Roles(Role.ORGANIZER)
  getCurrentUserCreatedEvents(
    @Req() req: Request,
    @Query('status', new ParseEnumPipe(EventStatus, { optional: true }))
    status?: EventStatus,
  ): Promise<Event[]> {
    const user = req.user as JwtAccessPayload;
    return this.userService.getCreatedEvents(user.sub, status);
  }
}
