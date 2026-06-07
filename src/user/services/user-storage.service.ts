import { Injectable ,NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploadException } from '../exceptions/image-upload.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_ORGANIZER_IMAGE_URL, DEFAULT_PARTICIPANT_IMAGE_URL } from '../constants/user-images.constant';
import { ProfileNotFoundException } from '../exceptions/profile-not-found.exception';

export type ProfileImageType = 'participant' | 'organizer';

@Injectable()
export class UserStorageService {
  private readonly supabase: SupabaseClient;
  private readonly BUCKET = 'evenite-images';

  constructor(
    private readonly prisma: PrismaService,
  ) {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  // participant -> participant/{uuid}.ext
  // organizer -> organizer/{uuid}.ext
  async uploadImageToStorage(
    file: Express.Multer.File,
    type: ProfileImageType,
  ): Promise<string> {
    const ext = this.getExtension(file.mimetype);
    const folder = type === 'participant' ? 'participant' : 'organizer';
    const filename = `${folder}/${uuidv4()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(this.BUCKET)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new ImageUploadException(
        'Failed to upload image. Please try again.',
      );
    }

    const { data } = this.supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(filename);

    return data.publicUrl;
  }

  resolveImageUrl(imageUrl: string | undefined | null, defaultUrl: string): string {
    if (!imageUrl || imageUrl.trim() === '') {
      return defaultUrl;
    }
    return imageUrl;
  }

  async deleteOrphanParticipantImageIfReplaced(
    userId: string,
    newImageUrl: string,
  ): Promise<void> {
    const existing = await this.prisma.participantProfile.findUnique({
      where: { userId },
      select: { imageUrl: true },
    });

    if (!existing) {
      throw new ProfileNotFoundException('Participant profile not found.');
    }

    const oldImageUrl = existing.imageUrl;
    if (
      oldImageUrl &&
      oldImageUrl !== newImageUrl &&
      oldImageUrl !== DEFAULT_PARTICIPANT_IMAGE_URL
    ) {
      await this.deleteOldImageFromStorage(oldImageUrl);
    }
  }

  async deleteOrphanOrganizerImageIfReplaced(
    userId: string,
    newImageUrl: string,
  ): Promise<void> {
    const existing = await this.prisma.organizerProfile.findUnique({
      where: { userId },
      select: { imageUrl: true },
    });

    if (!existing) {
      throw new ProfileNotFoundException('Organizer profile not found.');
    }

    const oldImageUrl = existing.imageUrl;
    if (
      oldImageUrl &&
      oldImageUrl !== newImageUrl &&
      oldImageUrl !== DEFAULT_ORGANIZER_IMAGE_URL
    ) {
      await this.deleteOldImageFromStorage(oldImageUrl);
    }
  }

  async deleteOldImageFromStorage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;
    const filePath = this.extractPathFromUrl(imageUrl);
    if (!filePath) return;

    await this.supabase.storage.from(this.BUCKET).remove([filePath]);
  }

  // Private helper methods
  private getExtension(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    return map[mimetype] ?? 'jpg';
  }

  // Extracts Supabase storage path from public URL
  private extractPathFromUrl(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);
      const marker = `/object/public/${this.BUCKET}/`;
      const index = url.pathname.indexOf(marker);
      if (index === -1) return null;

      return decodeURIComponent(url.pathname.substring(index + marker.length));
    } catch {
      return null;
    }
  }
}
