const fs = require('fs');
const mkdirp = require('mkdirp');
const pageviews = require('pageviews');
const d3 = require('d3');
const outputDir = './output';

function init() {
  mkdirp(outputDir);

  pageviews
    .getAggregatedPageviews({
      project: 'en.wikipedia',
      agent: 'user',
      granularity: 'daily',
      start: '2015070100',
      end: '2018091300'
    })
    .then(result => {
      const output = d3.csvFormat(result.items);

      const median = d3.median(result.items, d => d.views);
      console.log({ median });
      fs.writeFileSync('./output/wiki-pageviews.csv', output);
    })
    .catch(console.error);
}

init();
