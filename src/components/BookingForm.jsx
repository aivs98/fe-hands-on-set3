import { useEffect, useMemo, useRef, useState } from 'react';
import { DAY_START, DAY_END, STEP, slots, toMin, formatDuration } from '../lib/time.js';
import { validateBooking, validateEmail } from '../lib/validation.js';

const START_OPTIONS = slots(DAY_START, DAY_END - STEP);
const END_OPTIONS = slots(DAY_START + STEP, DAY_END);

export default function BookingForm({ bookings, onCreate, prefill }) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const formRef = useRef(null);
  const titleRef = useRef(null);

  // Clicking a free slot in the schedule pre-fills the times.
  useEffect(() => {
    if (!prefill) return;
    setStart(prefill.start);
    setEnd(prefill.end);
    setSubmitError(null);
    titleRef.current?.focus();
  }, [prefill]);

  const errors = useMemo(
    () => validateBooking({ title, start, end, attendees }, bookings),
    [title, start, end, attendees, bookings],
  );
  const show = (k) => ((submitted || touched[k]) ? errors[k] : null);
  const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));

  function addEmail() {
    const err = validateEmail(emailInput, attendees);
    setEmailError(err);
    if (err) return;
    setAttendees((a) => [...a, emailInput.trim()]);
    setEmailInput('');
  }

  async function submit(e) {
    e.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setSubmitError(null);
    let list = attendees;
    if (emailInput.trim()) {
      const err = validateEmail(emailInput, attendees);
      if (err) { setEmailError(err); return; }
      list = [...attendees, emailInput.trim()];
    }
    const errs = validateBooking({ title, start, end, attendees: list }, bookings);
    if (Object.keys(errs).length) {
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({ title: title.trim(), start, end, attendees: list });
      setTitle(''); setStart(''); setEnd(''); setAttendees([]); setEmailInput('');
      setTouched({}); setSubmitted(false);
    } catch (err) {
      setSubmitError(err.message); // keep everything the user typed
      setAttendees(list); setEmailInput('');
    } finally {
      setSubmitting(false);
    }
  }

  const duration = start && end && toMin(end) > toMin(start) ? formatDuration(toMin(end) - toMin(start)) : null;

  return (
    <form ref={formRef} className="panel form" onSubmit={submit} noValidate>
      <h2>Book this room</h2>

      <div className="field">
        <label htmlFor="title">Meeting title</label>
        <input id="title" ref={titleRef} value={title} maxLength={120} placeholder="e.g. Quarterly planning"
          onChange={(e) => setTitle(e.target.value)} onBlur={() => touch('title')}
          aria-invalid={!!show('title')} />
        <p className="err">{show('title')}</p>
      </div>

      <div className="row">
        <div className="field">
          <label htmlFor="start">Starts</label>
          <select id="start" value={start} onChange={(e) => { setStart(e.target.value); touch('start'); }}
            aria-invalid={!!show('start')}>
            <option value="">Select…</option>
            {START_OPTIONS.map((t) => <option key={t}>{t}</option>)}
          </select>
          <p className="err">{show('start')}</p>
        </div>
        <div className="field">
          <label htmlFor="end">Ends {duration && <span className="muted">({duration})</span>}</label>
          <select id="end" value={end} onChange={(e) => { setEnd(e.target.value); touch('end'); }}
            aria-invalid={!!show('end')}>
            <option value="">Select…</option>
            {END_OPTIONS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <p className="err" aria-live="polite">{show('end')}</p>

      <div className="field">
        <label htmlFor="email">Attendees <span className="muted">(optional)</span></label>
        <div className="row tight">
          <input id="email" type="email" value={emailInput} placeholder="name@company.com"
            onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(); } }}
            aria-invalid={!!(emailError || show('attendees'))} />
          <button type="button" className="btn" onClick={addEmail}>Add</button>
        </div>
        <p className="err">{emailError || show('attendees')}</p>
        {attendees.length > 0 && (
          <ul className="chips">
            {attendees.map((a) => (
              <li key={a}>{a}
                <button type="button" aria-label={`Remove ${a}`} onClick={() => setAttendees((l) => l.filter((x) => x !== a))}>×</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {submitError && <div className="banner error" role="alert">{submitError} Your details are still here.</div>}
      <button className="btn primary wide" disabled={submitting}>{submitting ? 'Booking…' : 'Book room'}</button>
    </form>
  );
}
