To run it: unzip, then npm install, npm run dev, and npm test. The three acceptance cases for the form (10:30–11:30 blocked, 11:00–12:00 allowed, 09:00–12:00 over a 10:00–10:30 booking blocked) gave the expected results in a quick Node check of the validation code.

Project structure
room-booking/
├── index.html
├── package.json            React 18, Vite, Vitest
├── vite.config.js
└── src/
    ├── main.jsx            entry point
    ├── App.jsx             page state: loading, create, optimistic cancel, notices
    ├── styles.css          light and dark themes, responsive, visible focus
    ├── api/mockApi.js      fake backend (rooms, bookings, create, cancel)
    ├── hooks/useUrlView.js room and date stored in the URL
    ├── lib/
    │   ├── time.js         minutes/"HH:MM" helpers, date helpers
    │   ├── validation.js   all booking rules (pure functions)
    │   └── validation.test.js
    └── components/
        ├── Schedule.jsx    day timeline, free gaps, inline cancel confirm
        └── BookingForm.jsx form with per-field errors
How it works
Mock API: every call waits a random 300–800 ms. Creating a booking fails 10% of the time with a “try again” message. It also re-checks for overlaps on the server side, which is what produces the “someone just booked this room” rejection. I also made cancelling fail 10% of the time, which the spec didn’t ask for, so the rollback is easy to see.
URL state: the room and date live in ?room=aurora&date=2026-11-20. Back/forward and refresh restore the view, and missing or invalid values fall back to the first room and today.
Schedule: bookings appear in time order from 09:00 to 18:00, with the free gaps between them shown as dashed rows. Clicking a free gap pre-fills the form’s start and end.
Validation: validateBooking checks title, hours, start before end, the 4-hour limit, valid and unique emails, and overlap. Overlap is start < existing.end && end > existing.start, so back-to-back bookings pass and a booking that covers another one is blocked. Both the form and the mock server use the same overlap check.
Errors in the form: each error shows beside its field and appears after you touch the field or press submit. Time errors sit under the time row, and the first invalid field gets focus on submit.
API rejections: the reason is shown and everything you typed stays. After a conflict, the schedule refreshes so you can see the booking that blocked you.
Cancel: clicking “Cancel meeting” opens an inline “Yes, cancel meeting / Keep it” confirmation. Confirming removes the card straight away. If the API call fails, the booking is put back and an error explains why. Results from a slow request are ignored if you’ve already switched room or date.
Usability: it has loading skeletons, retry on load errors, add-by-Enter for emails with removable chips, a live duration next to the end time, and a disabled button while submitting to prevent double-booking. Colours work in light and dark mode.