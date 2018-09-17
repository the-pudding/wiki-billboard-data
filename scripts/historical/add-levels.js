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

  const filtered = withLevels.filter(d => {
    const bottom = d[0].level < 5;
    const extent = d3.extent(d, d => d.level);
    const diff = extent[1] - extent[0];
    return bottom && diff >= 3;
  });

  const upComers = filtered.filter(d => {
    const max = d3.max(d, v => v.level);
    return max < 5;
  });

  const madeIt = filtered.filter(d => {
    const max = d3.max(d, v => v.level);
    return max >= 5;
  });

  const flatUp = [].concat(...upComers);
  const flatMade = [].concat(...madeIt);
  const outputUp = d3.csvFormat(flatUp);
  const outputMade = d3.csvFormat(flatMade);

  console.log(upComers.length);
  console.log(madeIt.length);
  fs.writeFileSync('./output/up-and-comers.csv', outputUp);
  fs.writeFileSync('./output/made-it.csv', outputMade);
}

init();
