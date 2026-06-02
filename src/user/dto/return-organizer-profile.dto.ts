export interface ReturnOrganizerProfileDto {
  id: string;
  name: string;
  bio: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLineId: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  createdAt: Date;
}
