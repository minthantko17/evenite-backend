import { BadRequestException } from '@nestjs/common';

export class EventStatusChangeException extends BadRequestException {
    constructor(message?: string) {
        super(message || 'There was an error changing the event status.');
    }
}