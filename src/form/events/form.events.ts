// payload of the internal EventEmitter2 event 'feedback.submitted',
// emitted after the feedback response is saved.
export interface FeedbackSubmittedPayload {
  eventId: string;
  organizerProfileId: string;
}
