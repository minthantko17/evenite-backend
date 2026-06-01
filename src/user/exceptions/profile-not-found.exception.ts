import { NotFoundException } from '@nestjs/common';

export class ProfileNotFoundException extends NotFoundException {
    constructor(message: string){
        super(message);
    }
}
