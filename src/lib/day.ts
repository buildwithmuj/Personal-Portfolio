/**
 * The owner's typical day (profile.day), told as it happens in their own time zone. Times are
 * 24-hour "HH:MM" strings, which compare correctly as text.
 */
export type TaskState = 'done' | 'now' | '';

/**
 * Each task's state at `now`: nothing until its time comes, then "now" while it is the latest to
 * have started, and "done" once the next has. Both are shown ticked: a task is ticked the moment
 * its time comes (DayReminders.astro).
 */
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

/** The watch shows its night face from 19:00 until the day starts again at 06:00. */
export function isNight(now: string): boolean {
  return now >= '19:00' || now < '06:00';
}
