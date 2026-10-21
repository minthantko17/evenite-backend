// payloads of the internal EventEmitter2 events 'registration.created' and
// 'registration.cancelled', emitted after the DB transaction commits.
export interface RegistrationCreatedPayload {
  eventId: string;
  organizerProfileId: string;
  participantProfileId: string;
}

export interface RegistrationCancelledPayload {
  eventId: string;
  organizerProfileId: string;
  participantProfileId: string;
}
