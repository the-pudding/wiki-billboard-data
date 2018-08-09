const fs = require('fs');
const d3 = require('d3');
const mkdirp = require('mkdirp');
const wiki = require('wikijs').default;

const START_YEAR = 1900;
const date = new Date();
const END_YEAR = date.getFullYear();

const years = d3.range(START_YEAR, END_YEAR + 1);

const outputDir = './output/year-pages';

function download(year) {
  return new Promise((resolve, reject) => {
    wiki()
      .page(year)
      .then(page => page.html())
      .then(response => {
        fs.writeFileSync(`${outputDir}/${year}.html`, response);
        resolve();
      })
      .catch(reject);
  });
}

async function init() {
  mkdirp(outputDir);

  let i = 0;
  for (const year of years) {
    await download(year)
      .then(() => console.log(`${i} of ${years.length}`))
      .catch(console.error);
    i += 1;
  }
}

init();
