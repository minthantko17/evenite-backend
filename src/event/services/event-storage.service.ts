import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { BannerUploadException } from '../exceptions/banner-upload.exception';
import { DEFAULT_BANNER_URL } from '../constants/event-category.constant';

const BUCKET_NAME = 'evenite-images';

@Injectable()
export class EventStorageService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  async uploadBannerToStorage(file: Express.Multer.File): Promise<string> {
    const ext = this.getFileExtension(file.mimetype);
    const fileName = `banners/${uuidv4()}${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new BannerUploadException();
    }

    const { data } = this.supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  resolveBannerUrl(bannerUrl: string | undefined): string {
    if (!bannerUrl || bannerUrl.trim() === '') {
      return DEFAULT_BANNER_URL;
    }
    return bannerUrl;
  }

  async deleteOrphanBannerIfReplaced(
    oldBannerUrl: string | null,
    newBannerUrl: string | undefined,
  ): Promise<{ message: string }> {
    const resolvedNew = this.resolveBannerUrl(newBannerUrl);

    if (
      oldBannerUrl &&
      oldBannerUrl !== resolvedNew &&
      oldBannerUrl !== DEFAULT_BANNER_URL
    ) {
      const result = await this.deleteBannerFromStorage(oldBannerUrl);
      return result;
    }
    return { message: 'No orphan banner to delete' };
  }

  async deleteBannerFromStorage(bannerUrl: string): Promise<{ message: string }> {
    const filePath = this.extractFilePathFromUrl(bannerUrl);
    if (!filePath) {
      return { message: 'Failed to extract file path from URL' };
    }
    const { error } = await this.supabase.storage.from(BUCKET_NAME).remove([filePath]);
    if (error) {
      return { message: 'Failed to delete banner from storage' };
    }
    return { message: 'Orphan banner deleted successfully' };
  }

  // --- private helpers ---

  private getFileExtension(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    return map[mimetype] ?? '.jpg';
  }

  private extractFilePathFromUrl(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);
      const marker = `/object/public/${BUCKET_NAME}/`;
      const index = url.pathname.indexOf(marker);
      if (index === -1) {
        return null;
      }
      // will return only file name
      return decodeURIComponent(url.pathname.substring(index + marker.length));
    } catch {
      return null;
    }
  }
}