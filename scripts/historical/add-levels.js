const d3 = require('d3');
const fs = require('fs');
const mkdirp = require('mkdirp');

const levels = [0, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].reverse();
const numLevels = levels.length - 1;

function addLevels(data) {
  const clean = data.map(d => ({ ...d, median: +d.median }));

  let prev = numLevels;
  const withLevel = clean.reverse().map(d => {
    const i = levels.findIndex(l => d.median > l);
    const index = i === -1 ? 0 : numLevels - i;
    const level = Math.min(prev, index);

    prev = level;

    return {
      ...d,
      level
    };
  });

  const withChange = withLevel.reverse().map((d, i) => ({
    ...d,
    change: i > 0 && d.level !== withLevel[i - 1].level
  }));

  return withChange;
}

function init() {
  mkdirp('./output');

  const files = fs
    .readdirSync('./input/pageviews-binned--week/')
    .filter(d => d.includes('.csv'));
  const data = files.map(d =>
    d3.csvParse(fs.readFileSync(`./input/pageviews-binned--week/${d}`, 'utf-8'))
  );

  const withLevels = data.map(addLevels);

  const blacklist = ['Vanessa_Williams'];

  const filtered = withLevels.filter(d => d.length >= 4).filter(d => {
    const bottom = d[0].level < 5;
    const min = d3.min(d, d => d.level);
    const maxSustainedFourWeeks = d[d.length - 4].level;
    const diff = maxSustainedFourWeeks - min;
    const data2015 = d.filter(v => v.timestamp.startsWith('2015'));
    const count2015 = data2015.length;
    const median2015 = d3.median(data2015, v => v.median);
    const startedIn2015 = count2015 < 27; // 27 = num of total weeks in 2015 since start of data
    const smallIn2015 = startedIn2015 || median2015 < levels[7]; // 7 = 100
    // TODO filter by blacklist

    return bottom && diff >= 4 && smallIn2015;
  });

  // const upComers = filtered.filter(d => {
  //   const max = d3.max(d, v => v.level);
  //   return max <= 6;
  // });

  // const madeIt = filtered.filter(d => {
  //   const max = d3.max(d, v => v.level);
  //   const min = d3.min(d, v => v.level);
  //   return max > 6 && min < 4;
  // });
  console.log(filtered.length);

  const flat = [].concat(...filtered);
  const output = d3.csvFormat(flat);

  fs.writeFileSync('./output/web.csv', output);
}

init();
