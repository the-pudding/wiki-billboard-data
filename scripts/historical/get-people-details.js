const fs = require('fs');
const mkdirp = require('mkdirp');
const d3 = require('d3');
const request = require('request');
const uniq = require('lodash.uniqby')
const outputDir = './output';
const BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';

function getDetails(person) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${encodeURI(person)}`;
    request(url, (err, resp, body) => {
      if (err) reject(err);
      else if (resp.statusCode === 200) {
        const data = JSON.parse(body);
        const { pageid, thumbnail, description, extract } = data;
        const { canonical, display } = data.titles;

        const thumbnail_source = thumbnail ? thumbnail.source : null;
        const thumbnail_width = thumbnail ? thumbnail.width : null;
        const thumbnail_height = thumbnail ? thumbnail.height : null;

        resolve({
          article:person,
          pageid,
          description,
          canonical,
          display,
          thumbnail_source,
          thumbnail_width,
          thumbnail_height,
          extract: extract.replace(/\n/g, '')
        });
      } else reject(resp.statusCode);
    });
  });
}

function getInfo({ d, sheetData }) {
  const match = sheetData.find(s => s.canonical === d.canonical);
  if (!match) return {};
  return {
    industry: match.industry,
    cause: match.cause_broad,
    cause_specific: match.cause_specific,
    description_short: match.description_short,
    impact_annotation: match.impact_annotation,
    impact_x: match.impact_x,
    impact_dx: match.impact_dx,
    impact_dy: match.impact_dy,
    impact_type: match.impact_type,
    perspective_show: match.perspective_show,
    display: !!match.display ? match.display : d.display
  };
}

async function downloadAll(uniquePeople) {

  const withDetails = [];

  let index = 0;
  for (person of uniquePeople) {
    console.log(`${index + 1} of ${uniquePeople.length}: ${person}`);
    await getDetails(person)
      .then(response => {
        withDetails.push(response);
      })
      .catch(err => {
        console.log(err);
        withDetails.push(person);
      });
    index += 1;
  }

  const output = d3.csvFormat(withDetails);
  fs.writeFileSync('./output/people--details.csv', output);
}

function init() {
  mkdirp(outputDir);

  const people = d3.csvParse(fs.readFileSync('./output/web.csv','utf-8'))

  const uniquePeople = uniq(people,d => d.article).map(d => d.article)

  downloadAll(uniquePeople)
}

init();