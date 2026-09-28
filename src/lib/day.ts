/**
 * The owner's typical day (profile.day), told as it happens in their own time zone. Times are
 * 24-hour "HH:MM" strings, which compare correctly as text.
 */
export type TaskState = 'done' | 'now' | '';

/** Each task's state at `now`: done once the next task has started, "now" while it runs. */
export function taskStates(times: readonly string[], now: string): TaskState[] {
  return times.map((time, index) => {
    const next = times[index + 1] ?? '24:00';
    if (now >= next) return 'done';
    return now >= time ? 'now' : '';
  });
}

/** The time ("HH:MM", 24-hour) in a time zone. */
export function localTime(timeZone: string | undefined, date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
