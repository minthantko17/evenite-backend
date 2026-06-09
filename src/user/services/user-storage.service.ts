import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploadException } from '../exceptions/image-upload.exception';

export type ProfileImageType = 'participant' | 'organizer';

@Injectable()
export class UserStorageService {
  private readonly supabase: SupabaseClient;
  private readonly BUCKET = 'evenite-images';

  constructor() {
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

  resolveImageUrl(
    imageUrl: string | undefined | null,
    defaultUrl: string,
  ): string {
    if (!imageUrl || imageUrl.trim() === '') return defaultUrl;
    return imageUrl;
  }

  async deleteOrphanImageIfReplaced(
    oldImageUrl: string | null,
    newImageUrl: string,
    defaultUrl: string,
  ): Promise<void> {
    if (
      oldImageUrl &&
      oldImageUrl !== newImageUrl &&
      oldImageUrl !== defaultUrl
    ) {
      await this.deleteImageFromStorage(oldImageUrl);
    }
  }

  async deleteImageFromStorage(imageUrl: string): Promise<void> {
    const filePath = this.extractPathFromUrl(imageUrl);
    if (!filePath) return;
    await this.supabase.storage.from(this.BUCKET).remove([filePath]);
  }

  // --- private helpers ---

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
