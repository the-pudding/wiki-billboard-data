const d3 = require('d3');
const fs = require('fs');
const mkdirp = require('mkdirp');

const binWeek = 7;
const binMonth = 30;

function zeroPad(t) {
  return d3.format('02')(t);
}

function parseTimestamp(s) {
  const year = +s.substring(0, 4);
  const month = +s.substring(4, 6) - 1;
  const day = +s.substring(6, 8);
  return { year, month, day };
}

function bin(inputData, binSize) {
  return inputData.map(data => {
    const nested = d3
      .nest()
      .key(d => d[`bin${binSize}`])
      .rollup(values => ({
        median: d3.median(values, v => v.views),
        timestamp: values[0].timestamp
      }))
      .entries(data)
      .map(d => ({
        bin: d.key,
        binSize,
        median: d.value.median,
        timestamp: d.value.timestamp,
        article: data[0].article
      }));
    return nested;
  });
}

function generateDates(s, e) {
  const usec = 86400000;
  const start = new Date(s.year, s.month, s.day);
  const end = new Date(e.year, e.month, e.day);
  let timestamp = start.getTime();
  const output = [];
  while (timestamp <= end) {
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
  mkdirp('./output/pageviews-binned--month');
  mkdirp('./output/pageviews-binned--week');
  mkdirp('./output/pageviews-all');

  const files = fs
    .readdirSync('./output/people-pageviews/')
    .filter(d => d.includes('.json'));

  const peopleWithData = files.map((file, index) => {
    console.log(index);
    const data = JSON.parse(
      fs.readFileSync(`./output/people-pageviews/${file}`, 'utf-8')
    );
    const start = parseTimestamp(data[0].timestamp);
    const end = parseTimestamp(data[data.length - 1].timestamp);
    const dates = generateDates(start, end);
    const filledInDates = dates.map((date, i) => {
      const bin7 = Math.floor(i / binWeek);
      const bin30 = Math.floor(i / binMonth);
      const timestamp = `${date.year}${date.month}${date.day}00`;
      const match = data.find(d => d.timestamp === timestamp);
      if (match)
        return {
          article: match.article,
          views: match.views,
          timestamp: match.timestamp.substring(0, 8),
          bin7,
          bin30
        };
      else
        return {
          article: data[0].article,
          views: 0,
          timestamp: timestamp.substring(0, 8),
          bin7,
          bin30
        };
    });
    return filledInDates;
  });

  const peopleNestedMonth = bin(peopleWithData, binMonth);

  const peopleNestedWeek = bin(peopleWithData, binWeek);

  peopleNestedMonth.forEach(d => {
    const formatted = d3.csvFormat(d);
    fs.writeFileSync(
      `./output/pageviews-binned--month/${d[0].article}.csv`,
      formatted
    );
  });

  peopleNestedWeek.forEach(d => {
    const formatted = d3.csvFormat(d);
    fs.writeFileSync(
      `./output/pageviews-binned--week/${d[0].article}.csv`,
      formatted
    );
  });

  peopleWithData.forEach(d => {
    const formatted = d3.csvFormat(d);
    fs.writeFileSync(`./output/pageviews-all/${d[0].article}.csv`, formatted);
  });
}

init();
