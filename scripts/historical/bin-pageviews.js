const d3 = require('d3');
const fs = require('fs');
const mkdirp = require('mkdirp');

const binWeek = 7;
const binMonth = 30;
const medianViews = 251446219;

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
        pageviews_median: d3.median(values, v => v.views_adjusted),
        pageviews_sum: d3.sum(values, v => v.views_adjusted),
        timestamp: values[0].timestamp
      }))
      .entries(data)
      .map(d => ({
        bin: d.key,
        binSize,
        pageviews_median: d.value.pageviews_median,
        pageviews_sum: d.value.pageviews_sum,
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

function joinPeople(data) {
  const output = [];

  data
    .filter(d => {
      let keep = true;
      if (d[0].article.includes('_Jr') || d[0].article.includes('_Sr')) {
        keep = false;
        if (!d[0].article.includes(',_') && d[0].article.includes('r.'))
          keep = true;
      } else if (d[0].article.includes(',')) keep = false;
      return keep;
    })
    .forEach(d => {
      if (
        (!d[0].article.includes(',') && d[0].article.includes('_Jr.')) ||
        d[0].article.includes('_Sr.')
      ) {
        const alt1 = d[0].article.replace(/_(J|S)r\./, (m, g) => `,_${g}r.`);
        const alt2 = d[0].article.replace(/_(J|S)r\./, (m, g) => `,_${g}r`);
        const alt3 = d[0].article.replace(/_(J|S)r\./, (m, g) => `_${g}r`);
        const match1 = data.find(v => v[0].article === alt1);
        const match2 = data.find(v => v[0].article === alt2);
        const match3 = data.find(v => v[0].article === alt3);
        const combined = d.map((e, i) => ({
          ...e,
          views:
            e.views +
            (match1 ? match1[i].views : 0) +
            (match2 ? match2[i].views : 0) +
            (match3 ? match3[i].views : 0)
        }));
        output.push(combined);
      } else if (d[0].article.includes(',')) {
        const alt1 = d[0].article.replace(',', '');
        const match1 = data.find(v => v[0].article === alt1);
        const combined = d.map((e, i) => ({
          ...e,
          views: e.views + (match1 ? match1[i].views : 0)
        }));
        output.push(combined);
      } else {
        const alt1 = d[0].article.replace(',', '');
        const match1 = data.filter(v => v[0].article === alt1);
        if (match1.length === 1) output.push(d);
      }
    });

  return output.map(d => {
    const firstNonZero = d.findIndex(v => v.views > 0);
    const lastNonZero =
      d.length -
      d
        .map(v => v.views)
        .reverse()
        .findIndex(v => v > 0);
    return d.slice(firstNonZero, lastNonZero + 1);
  });
}

function init() {
  mkdirp('./output/pageviews-binned--month');
  mkdirp('./output/pageviews-binned--week');
  mkdirp('./output/pageviews-all');

  const wikiPageviews = d3
    .csvParse(fs.readFileSync(`./output/wiki-pageviews.csv`, 'utf-8'))
    .map(d => ({ ...d, views: +d.views }));

  const files = fs
    .readdirSync('./output/people-pageviews/')
    .filter(d => d.includes('.json'));
  const peopleWithData = files.map((file, index) => {
    console.log(index);
    const data = JSON.parse(
      fs.readFileSync(`./output/people-pageviews/${file}`, 'utf-8')
    );
    const start = parseTimestamp('2015070100');
    const end = parseTimestamp('2018091300');
    const dates = generateDates(start, end);
    const filledInDates = dates.map((date, i) => {
      const bin7 = Math.floor(i / binWeek);
      const bin30 = Math.floor(i / binMonth);
      const timestamp = `${date.year}${date.month}${date.day}00`;
      const match = data.find(d => d.timestamp === timestamp);
      const wikiDayViews = wikiPageviews.find(d => d.timestamp === timestamp)
        .views;

      if (match)
        return {
          article: match.article,
          views: match.views,
          views_adjusted: (match.views / wikiDayViews) * medianViews,
          timestamp: match.timestamp.substring(0, 8),
          bin7,
          bin30
        };
      else
        return {
          article: data[0].article,
          views: 0,
          views_adjusted: 0,
          timestamp: timestamp.substring(0, 8),
          bin7,
          bin30
        };
    });
    return filledInDates;
  });

  const peopleJoined = joinPeople(peopleWithData);

  const peopleNestedMonth = bin(peopleJoined, binMonth);

  const peopleNestedWeek = bin(peopleJoined, binWeek);

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
