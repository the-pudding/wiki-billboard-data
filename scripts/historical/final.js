const fs = require('fs');
const mkdirp = require('mkdirp');
const d3 = require('d3');
const outputDir = './output';

// look back 3 rows, that is max sustained
// find latest occurence of max sustained
// go back 6 months, if different than latest, then up + comer
function init() {
  mkdirp(outputDir);
  const people = d3.csvParse(
    fs.readFileSync('./output/web--people.csv', 'utf-8')
  );
  const month = d3.csvParse(fs.readFileSync('./output/web.csv', 'utf-8'));

  const nested = d3
    .nest()
    .key(d => d.article)
    .entries(month);

  const filtered = nested.filter(person => {
    const { values } = person;
    const max = +values[values.length - 3].level;
    // made it
    if (max >= 6) return true;
    const tempValues = values.map(v => v).reverse();
    const latestOccurenceIndex = tempValues.findIndex(v => +v.level === max);
    const sixIndex = Math.min(latestOccurenceIndex + 6, tempValues.length - 1);
    const sixMonthLevel = +tempValues[sixIndex].level;
    return sixMonthLevel !== max;
  });

  const flat = [].concat(...filtered.map(f => f.values));

  fs.writeFileSync('./output/final--month.csv', d3.csvFormat(flat));

  const articles = filtered.map(f => f.key);

  const filteredPeople = people.filter(p => articles.includes(p.article));

  fs.writeFileSync('./output/final--people.csv', d3.csvFormat(filteredPeople));
}

init();
