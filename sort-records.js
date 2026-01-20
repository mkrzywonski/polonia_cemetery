const fs = require('fs');

const content = fs.readFileSync('./assets/records.js', 'utf8');
const json = content.replace('window.POLONIA_RECORDS = ', '').replace(/;\s*$/, '');
const records = JSON.parse(json);

records.sort((a, b) => {
  const lastCmp = (a.last_name || '').localeCompare(b.last_name || '');
  if (lastCmp !== 0) return lastCmp;

  const firstCmp = (a.first_name || '').localeCompare(b.first_name || '');
  if (firstCmp !== 0) return firstCmp;

  const parseDate = (d) => {
    if (!d) return 0;
    const parsed = Date.parse(d);
    return isNaN(parsed) ? 0 : parsed;
  };
  return parseDate(a.birth_date) - parseDate(b.birth_date);
});

const output = 'window.POLONIA_RECORDS = ' + JSON.stringify(records, null, 2) + ';';
fs.writeFileSync('./assets/records.js', output);
console.log('Sorted', records.length, 'records');
