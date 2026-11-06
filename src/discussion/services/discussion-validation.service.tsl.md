# DiscussionValidationService — Test Specification Language (Category-Partition)

Scope: public methods of `DiscussionValidationService`. `PrismaService` and
`RegistrationValidationService` are mocked collaborators; their outcome is
modeled as a category on this service (e.g. "Room exists: yes / no
[error]"), same convention as the other discussion-module TSLs.
`validateRoomWritable`'s CONCLUDED-status branch depends on wall-clock time
(`Date.now()`), so its categories are phrased in terms of "now relative to
the computed threshold" — tests control this via `jest.spyOn(Date, 'now')`.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

---

## validateRoomExists(roomId)

**Categories**
- Room existence (prisma.discussionRoom.findUnique)
  - room found → resolves `{ roomId, event }`
  - room not found → throws RoomNotFoundException [error]

---

## validateRoomAccess(event, role, participantProfileId, organizerProfileId)

**Categories**
- role
  - ORGANIZER
  - PARTICIPANT
- Ownership check [if role = ORGANIZER]
  - organizerProfileId === event.organizerId (isOwner) → resolves the
    organizer access-confirmation message; registrationValidationService is
    never called
  - organizerProfileId !== event.organizerId, or organizerProfileId is null
    → not the owner → falls through to the final throw [error]
- Participant registration check [if role = PARTICIPANT]
  - participantProfileId is truthy → delegates to
    registrationValidationService.validateConfirmedRegistration(event.id,
    participantProfileId)
    - collaborator resolves → returns the participant access-confirmation
      message
    - collaborator throws (e.g. RegistrationNotFoundException for a
      cancelled/nonexistent registration) → bubbles up unchanged, not
      wrapped [error]
  - participantProfileId is null/empty → skips the collaborator call
    entirely, falls through to the final throw [error] [single]
- Final fallback [single]: any combination that reaches neither the
  organizer-owner return nor the participant-with-id branch (e.g. ORGANIZER
  role with organizerProfileId null) throws RoomAccessDeniedException.

---

## validateRoomWritable(event)

**Categories**
- event.status
  - CANCELLED → throws RoomReadOnlyException with the
    cancellation-specific message [error]
  - CONCLUDED → evaluated further via the categories below
  - DRAFT / PUBLISHED / ONGOING → writable, returns the writable message,
    no time computation performed [single]
- CONCLUDED reference-time resolution [if status = CONCLUDED]
  - event.endAt present → referenceTime = endAt
  - event.endAt null, event.startAt present → referenceTime = startAt +
    CONCLUDED_FALLBACK_OFFSET_MS (6h)
  - event.endAt null, event.startAt null → referenceTime = epoch(0) + 6h
    (degenerate edge case) [single]
- CONCLUDED grace-period check [if status = CONCLUDED]
  - now ≤ referenceTime + READ_ONLY_GRACE_PERIOD_MS (72h) → still writable
  - now > referenceTime + 72h → throws RoomReadOnlyException with the
    default (non-cancellation) message [error]
- Boundary [single]: now exactly equal to referenceTime + 72h → writable
  (the throw condition is strictly `>`, not `>=`).

---

## validateMessageContent(content)

**Categories**
- Content after trimming
  - empty (empty string or all-whitespace) → throws
    MessageContentInvalidException('Message cannot be empty.') [error]
  - non-empty, length ≤ MAX_MESSAGE_LENGTH (2000) → passes
  - length > 2000 after trim → throws
    MessageContentInvalidException('Message cannot exceed 2000
    characters.') [error]
- Boundary [single]: exactly 2000 characters after trim → passes; exactly
  2001 → throws.
- Return value [single]: on success, returns the original `content`
  argument unchanged (including any leading/trailing whitespace) — the
  trimmed value is used only for the length check, not as the return value.

---

## validateAnnouncementSenderRole(role)

**Categories**
- role
  - ORGANIZER → returns the announcement-permission success message
  - PARTICIPANT (any non-ORGANIZER role) → throws
    AnnouncementNotAllowedException [error]
