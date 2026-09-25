const month = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function format(yearMonth: string): string {
  const [year = '1970', monthNumber = '01'] = yearMonth.split('-');
  return month.format(new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1)));
}

/** "Dec 2021 – present" or "Apr 2018 – Nov 2021" from YYYY-MM strings. */
export function formatRoleDates(start: string, end?: string): string {
  return `${format(start)} – ${end ? format(end) : 'present'}`;
}
