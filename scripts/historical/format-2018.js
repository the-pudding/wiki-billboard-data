const fs = require('fs');
const mkdirp = require('mkdirp');
const request = require('request');
const d3 = require('d3');

const outputDir = './output/format-2018';
const people = d3
  .csvParse(fs.readFileSync('./output/people.csv', 'utf-8'))
  .map(d => d.name.replace(/ /g, '_'));

function extractPeople(file) {
  console.log(file);

  const data = JSON.parse(fs.readFileSync(`./output/historical-rankings/${file}`));
  const { articles } = data.items[0];
  const filtered = articles.filter(d => people.includes(d.article));

  const date = file.replace('.json', '');
  const withDate = filtered.map((d, i) => ({
    ...d,
    rank_people: i,
    date
  }));
  fs.writeFileSync(`${outputDir}/${file}`,JSON.stringify(withDate));
}

function filterToPeople() {
  const files = fs.readdirSync('./output/historical-rankings').filter(d => d.includes('.json'));
  const peopleByDay = files.map(extractPeople);
}

function zeroPad(t) {
  return d3.format('02')(t);
}

function generateDates() {
  const usec = 86400000;
  const start = new Date(2018, 0, 1);
  const end = new Date().getTime() - usec;
  let timestamp = start.getTime();
  const output = [];
  while (timestamp < end) {
    const current = new Date(timestamp);
    const year = current.getFullYear();
    const month = zeroPad(current.getMonth() + 1);
    const day = zeroPad(current.getDate());
    output.push({ year, month, day });
    timestamp += usec;
  }
  return output;
}

function init() {
  mkdirp(outputDir);

  // create an arry of every single date since the start of wiki api
  const dates = generateDates();

  // filter down json to only entities in our people.csv
  const filteredData = filterToPeople();
}

init();
