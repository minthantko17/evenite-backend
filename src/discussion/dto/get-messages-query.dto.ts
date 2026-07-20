export class GetMessagesQueryDto {
  cursor?: string;  // message id to paginate from
  direction?: 'before' | 'after'; //before - scroll up, after - scroll down
  limit?: number;
}
