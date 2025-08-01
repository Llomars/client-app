// utils/icsGenerator.js
// Génère un fichier ICS pour un rendez-vous

export function generateICS({ title, description, location, startDate, endDate }) {
  function pad(n) {
    return n < 10 ? '0' + n : n;
  }
  function formatDate(date) {
    return (
      date.getUTCFullYear() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      '00Z'
    );
  }
  const dtStart = formatDate(startDate);
  const dtEnd = formatDate(endDate);
  return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Botaik//Planning//FR\nBEGIN:VEVENT\nSUMMARY:${title}\nDESCRIPTION:${description}\nLOCATION:${location}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nEND:VEVENT\nEND:VCALENDAR`;
}

export function downloadICS(icsString, filename = 'event.ics') {
  const blob = new Blob([icsString], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
