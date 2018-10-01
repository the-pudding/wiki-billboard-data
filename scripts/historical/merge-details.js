const fs = require('fs');
const mkdirp = require('mkdirp');
const d3 = require('d3');
const outputDir = './output';

function init() {
  mkdirp(outputDir);

  const people = d3.csvParse(
    fs.readFileSync('./output/people--details.csv', 'utf-8')
  );
  const category = d3.csvParse(
    fs.readFileSync('./input/category.csv', 'utf-8')
  );

  const merged = people.map(d => {
    const match = category.find(c => c.article === d.article) || {};
    return {
      ...match,
      ...d
    };
  });

  const output = d3.csvFormat(merged);
  fs.writeFileSync('./output/web--people.csv', output);
}

init();
