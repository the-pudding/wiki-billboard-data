const fs = require('fs');
const mkdirp = require('mkdirp');
const request = require('request');
const d3 = require('d3');

const outputDir = './output/historical-rankings';
const people = d3
  .csvParse(fs.readFileSync('./output/people.csv', 'utf-8'))
  .map(d => d.name.replace(/ /g, '_'));

function extractPeople(file) {
  console.log(file);

  const data = JSON.parse(fs.readFileSync(`${outputDir}/${file}`));
  const { articles } = data.items[0];
  const filtered = articles.filter(d => people.includes(d.article));

  const date = file.replace('.json', '');
  const withDate = filtered.map((d, i) => ({
    ...d,
    rank_people: i,
    date
  }));
  return withDate;
}

function extractEntities(file) {
  console.log(file);

  const data = JSON.parse(fs.readFileSync(`${outputDir}/${file}`));
  const { articles } = data.items[0];

  const date = file.replace('.json', '');
  const withDate = articles.map((d, i) => ({
    ...d,
    date
  }));
  return withDate;
}

function outputAllEntities() {
    const files = fs.readdirSync(outputDir).filter(d => d.includes('.json'));
    const peopleByDay = files.map(extractEntities);
    const flatPeople = [].concat(...peopleByDay);
    return flatPeople;
}

function download({ year, month, day }) {
  const base =
    'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access';
  const url = `${base}/${year}/${month}/${day}`;
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) reject(error);
      else if (response.statusCode === 200) {
        fs.writeFileSync(`${outputDir}/${year}-${month}-${day}.json`, body);
        resolve();
      } else reject(response.statusCode);
    });
  });
}

async function downloadDays(dates) {
  for (const date of dates) {
    try {
      const stats = fs.statSync(
        `${outputDir}/${date.year}-${date.month}-${date.day}.json`
      );
      if (stats) {
        console.log(date, 'file exists');
      }
    } catch (err) {
      await download(date)
        .then(() => console.log(date))
        .catch(console.error);
    }
  }
}

function zeroPad(t) {
  return d3.format('02')(t);
}

function generateDates() {
  const usec = 86400000;
  const start = new Date(2015, 6, 1);
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

  // download json for each day
  downloadDays(dates);

  // filter down json to only entities
  const filteredData = outputAllEntities();

  // output filtered down data
  const output = d3.csvFormat(filteredData);

  mkdirp(outputDir);
  fs.writeFileSync('./output/historical-rankings.csv', output);
}

init();
