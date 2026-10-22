# AttendanceValidationService — Test Specification Language (Category-Partition)

Scope: public methods of `AttendanceValidationService` (M-XY-001 … M-XY-003).
`PrismaService` is a mocked collaborator; its outcome is modeled as a
category on `validateNoFeedbackSubmitted` (e.g. "Feedback responses found:
none / some [error]"). The two status validators are pure and need no mocks.
For thrown exceptions, tests assert the exception class plus its response
body (`message`, `errorCode`), since clients rely on `errorCode`.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## validateEventCheckable(status)

**Categories**
- event status
  - DRAFT → resolves the confirmation message
  - PUBLISHED → resolves the confirmation message
  - ONGOING → resolves the confirmation message
  - CONCLUDED → throws EventNotCheckableException (EVENT_NOT_CHECKABLE) [error]
  - CANCELLED → throws EventNotCheckableException (EVENT_NOT_CHECKABLE) [error]

---

## validateTicketActive(status)

**Categories**
- ticket status
  - ACTIVE → resolves the confirmation message
  - CANCELLED → throws TicketNotActiveException, TICKET_CANCELLED, "This
    ticket has been cancelled." [error]
  - EXPIRED → throws TicketNotActiveException, TICKET_EXPIRED, "This ticket
    has expired." [error]
  - USED → throws TicketNotActiveException with the generic code
    TICKET_NOT_ACTIVE and message "This ticket is not active." [error]
    (any status other than CANCELLED / EXPIRED)

---

## validateNoFeedbackSubmitted(registrationId)

**Categories**
- Feedback responses of the registration (prisma.formResponse.count, FEEDBACK
  forms only)
  - none (0) → resolves the confirmation message
  - one → throws FeedbackAlreadySubmittedException
    (FEEDBACK_ALREADY_SUBMITTED) [error]
  - several [single] → throws FeedbackAlreadySubmittedException [error]
- Query shape [single]: counts by `eventRegistrationId` and a form of type
  FEEDBACK (registration-form responses must not count).
- Database failure [single] (documents current behavior): the Prisma error
  bubbles up unchanged.
