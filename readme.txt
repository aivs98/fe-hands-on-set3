Project structure
meeting-planner/
├── index.html, package.json, tsconfig.json, vite.config.ts
└── src/
    ├── main.tsx, App.tsx, styles.css
    ├── types.ts                     Interval, Person, Room, Booking
    ├── api/mockApi.ts               people, rooms, bookings with attendees, endpoints
    ├── lib/
    │   ├── freeSlots.ts             the pure, typed free-slot calculation
    │   ├── freeSlots.test.ts
    │   ├── latest.ts                "latest request wins" guard
    │   ├── latest.test.ts
    │   └── time.ts                  small time and date helpers
    ├── hooks/useAvailability.ts     fetching, 10-second refresh, hidden-tab pause
    └── components/
        ├── AttendeePicker.tsx       searchable checkbox list
        ├── Timeline.tsx             rows, free slots, keyboard handling
        └── BookingDialog.tsx        start time, room and confirm
How it works
Free-slot function: findCommonFreeSlots(busyByPerson, minLength) clips every busy interval to 09:00–18:00, merges all of them into one sorted list, then returns each gap of at least minLength minutes. A gap exactly equal to D counts. It handles unsorted bookings and bookings inside or overlapping each other without special cases, and it doesn’t change its input.
Mock API: each booking has an attendees list, and listBookingsForPeople(ids, date) returns every booking on that date that includes any of them. Availability calls take 300–1500 ms, so responses can arrive out of order on purpose.
Booking in a room that fits: findAvailableRooms returns free rooms with enough seats, smallest first, and the dialog picks the first one.
Booking a slot: clicking a free slot opens a dialog where you can choose the start time within that slot (the length stays D). The mock API rejects a booking 25% of the time as if a colleague got there first, and the colleague’s booking really is added. The dialog closes and shows the conflict, and availability reloads, so the taken slot disappears.
Refresh: the hook reloads every 10 seconds, stops the timer when the tab is hidden, and reloads immediately when you come back. The page shows “Paused while this tab is hidden” meanwhile.
Late responses: each request gets a token from createLatest(), and only the newest token’s response is applied. Results are also tagged with the date and attendee selection they belong to, and the screen shows only results for the current selection. Switching attendees quickly therefore shows a loading state, never the previous selection’s data. latest.test.ts simulates a slow response arriving after a fast one.
Keyboard and screen readers: the free row is a listbox where the arrow keys, Home and End move between slots, and Enter books the focused one. Each slot is announced as “Free 11:00 to 13:00”. Each person’s row has a spoken summary such as “Alice: busy 09:30 to 11:00”.
Responsiveness with 30 attendees × 20 bookings: merging 600 intervals takes well under a millisecond. Changing D only recomputes the free slots, and the per-person rows are memoised so they don’t re-render. A test checks 30×20 intervals across every length option and fails if it takes more than 100 ms.