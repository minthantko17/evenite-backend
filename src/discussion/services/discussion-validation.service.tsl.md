## DiscussionValidationService

### `validateRoomExists(roomId: string)`

```
Parameter roomId:
  room existence:
    a DiscussionRoom with this id exists.        [property RoomExists] → returns { roomId, event }
    no DiscussionRoom with this id exists.       [error RoomNotFoundException] [single]
```

---

### `validateRoomAccess(event, role, participantProfileId, organizerProfileId)`

```
Parameter role:
  caller role:
    role is ORGANIZER.       [property RoleOrganizer]
    role is PARTICIPANT.     [property RoleParticipant]

Parameter organizerProfileId (relevant when RoleOrganizer):
  ownership match:
    organizerProfileId === event.organizerId.        [property IsOwner] [if RoleOrganizer]
    organizerProfileId !== event.organizerId.         [if RoleOrganizer]
    organizerProfileId is null.                        [if RoleOrganizer]

Parameter participantProfileId (relevant when RoleParticipant):
  presence:
    participantProfileId is non-null.        [property HasParticipantId] [if RoleParticipant]
    participantProfileId is null.             [if RoleParticipant]

Parameter registration status (via RegistrationValidationService, relevant when HasParticipantId):
  registration outcome:
    confirmed registration exists for event.id + participantProfileId.        [property ConfirmedReg] [if HasParticipantId]
    no registration, or registration not CONFIRMED.                           [error RegistrationNotFoundException] [if HasParticipantId]

Resulting test frames:
  RoleOrganizer + IsOwner                                    → returns { message: 'Organizer has access...' }   [single]
  RoleOrganizer + not-owner (or null organizerProfileId)      → falls through to final else → throws RoomAccessDeniedException
  RoleParticipant + HasParticipantId + ConfirmedReg           → returns { message: 'Participant has access...' } [single]
  RoleParticipant + HasParticipantId + not-confirmed          → throws RegistrationNotFoundException (bubbles, not caught)
  RoleParticipant + participantProfileId null                 → falls through to final else → throws RoomAccessDeniedException
```

---

### `validateRoomWritable(event: Event)`

```
Parameter event.status:
  status value:
    PUBLISHED.        [property StatusOpen] → writable
    ONGOING.          [property StatusOpen] → writable
    DRAFT.            [property StatusOpen] → writable 
    CANCELLED.        [error RoomReadOnlyException, message: "...cancelled..."] [single]
    CONCLUDED.        [property StatusConcluded]

Parameter event.endAt (relevant when StatusConcluded):
  presence:
    endAt is non-null.        [property HasEndAt] [if StatusConcluded]
    endAt is null.            [property NoEndAt] [if StatusConcluded]

Parameter event.startAt (relevant when NoEndAt):
  presence:
    startAt is non-null.      [if NoEndAt] → reference time = startAt + 6h
    startAt is null.          [if NoEndAt] → reference time = epoch(0) + 6h

Parameter elapsed time since reference time (relevant when StatusConcluded):
  boundary:
    now <= referenceTime + 72h.        [property WithinGrace] → writable
    now > referenceTime + 72h.         [error RoomReadOnlyException, default message] [if StatusConcluded]

Resulting test frames:
  StatusOpen (PUBLISHED)                                          → { message: 'Discussion room is writable.' }  [single]
  StatusOpen (ONGOING)                                            → { message: 'Discussion room is writable.' }  [single]
  StatusOpen (DRAFT)                                              → { message: 'Discussion room is writable.' }  [single]
  CANCELLED                                                        → throws, custom message                       [single]
  StatusConcluded + HasEndAt + WithinGrace                        → writable
  StatusConcluded + HasEndAt + past 72h                           → throws, default message
  StatusConcluded + NoEndAt + startAt present + WithinGrace       → writable
  StatusConcluded + NoEndAt + startAt present + past 72h          → throws
  StatusConcluded + NoEndAt + startAt null + WithinGrace          → writable (reference = epoch + 6h; "now" is always past this in practice — flag as effectively unreachable/edge case)
  StatusConcluded + NoEndAt + startAt null + past 72h             → throws (the realistic case for this sub-branch)
```

---

### `validateMessageContent(content: string)`

```
Parameter content:
  trimmed content:
    non-empty, length <= 2000 chars.                    [property ContentValid] → returns content
    empty after trim (e.g. "", "   ").                  [error MessageContentInvalidException, "cannot be empty"] [single]
    length > 2000 chars after trim.                      [error MessageContentInvalidException, "cannot exceed..."] [single]
    exactly 2000 chars after trim (boundary).             [property ContentValid] — boundary test, should pass
    exactly 2001 chars after trim (boundary).             [error] — boundary test, should fail
    content with leading/trailing whitespace, valid once trimmed.   [property ContentValid] — confirms trim happens before length check
```

---

### `validateAnnouncementPermission(isAnnouncement, role)`

```
Parameter isAnnouncement:
  flag value:
    true.        [property Announcing]
    false.       [property NotAnnouncing]

Parameter role (relevant when Announcing):
  caller role:
    ORGANIZER.         [property RoleOrganizer] [if Announcing]
    PARTICIPANT.       [error AnnouncementNotAllowedException] [if Announcing]

Resulting test frames:
  NotAnnouncing + any role                    → returns false                [single, role irrelevant]
  Announcing + RoleOrganizer                  → returns true                 [single]
  Announcing + RoleParticipant                → throws AnnouncementNotAllowedException  [single]
```

---