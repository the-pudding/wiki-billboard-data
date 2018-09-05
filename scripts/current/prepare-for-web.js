const request = require('request');
const d3 = require('d3');
const uniq = require('lodash.uniqby');
const fs = require('fs');
const pageviews = require('pageviews');
const uploadToS3 = require('./upload-to-s3');
const sendMail = require('./send-mail');

const AWS_PATH = '2018/08/wiki-billboard-data/web';
const LIMIT = 10;
const YEAR = 2017;
const MAX_SCORE = 1000;
const MAX_PEOPLE_TALLY = 50;

let dev = false;

function zeroPad(t) {
  return d3.format('02')(t);
}

function getDetails({ article, peopleWebData }) {
  const match = peopleWebData.find(p => p.article === article);
  if (match) return Promise.resolve(match);

  const baseUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary';
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/${encodeURI(article)}`;
    request(url, (err, resp, body) => {
      if (err) reject(err);
      else if (resp.statusCode === 200) {
        const data = JSON.parse(body);
        const { pageid, thumbnail, description, extract } = data;
        const { display } = data.titles;

        const thumbnail_source = thumbnail ? thumbnail.source : null;
        const thumbnail_width = thumbnail ? thumbnail.width : null;
        const thumbnail_height = thumbnail ? thumbnail.height : null;

        resolve({
          article,
          pageid,
          description,
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

function upload({ data, chart }) {
  return new Promise((resolve, reject) => {
    const string = d3.csvFormat(data);
    const path = `${AWS_PATH}/${chart}`;
    uploadToS3({ string, path, ext: 'csv' })
      .then(resolve)
      .catch(reject);
  });
}

function loadPeopleWeb() {
  return new Promise((resolve, reject) => {
    const t = new Date().getTime();
    const url = `https://pudding.cool/2018/08/wiki-billboard-data/web/2018-people.csv?version=${t}`;
    request(url, (err, response, body) => {
      if (err) reject(err);
      else if (response && response.statusCode === 200) {
        const people = d3.csvParse(body);
        resolve(people);
      } else reject(response.statusCode);
    });
  });
}

function loadPeople() {
  return new Promise((resolve, reject) => {
    const t = new Date().getTime();
    const url = `https://pudding.cool/2018/08/wiki-billboard-data/people/all.csv?version=${t}`;
    request(url, (err, response, body) => {
      if (err) reject(err);
      else if (response && response.statusCode === 200) {
        const people = d3.csvParse(body).map(d => ({
          ...d,
          article: d.name.replace(/ /g, '_')
        }));
        resolve(people);
      } else reject(response.statusCode);
    });
  });
}

function getOldPageviews(article) {
  return new Promise((resolve, reject) => {
    pageviews
      .getPerArticlePageviews({
        project: 'en.wikipedia',
        agent: 'user',
        granularity: 'daily',
        start: `${YEAR}0101`,
        end: `${YEAR}1231`,
        article
      })
      .then(result => {
        const exists = result.items.find(day => day.views && day.views > 0);
        resolve(exists);
      })
      .catch(reject);
  });
}

function downloadSheet({ id, gid }) {
  return new Promise((resolve, reject) => {
    const base = 'https://docs.google.com/spreadsheets/u/1/d';
    const url = `${base}/${id}/export?format=csv&id=${id}&gid=${gid}`;

    request(url, (err, response, body) => {
      if (err) reject(err);
      const data = d3.csvParse(body);
      resolve(data);
    });
  });
}

function liveChartAppearance({ people, data }) {
  return new Promise((resolve, reject) => {
    downloadSheet({
      id: '1B7hymymVfsvb0EQ_7g5WjgrvuJpBLeVi4HJuz4eNi6k',
      gid: '1196667091'
    })
      .then(annotations => {
        const output = data.filter(d => d.rank_people < LIMIT);
        // add annotations
        annotations
          .filter(a => a.approved.toLowerCase() === 'true')
          .forEach(a => {
            const match = output.find(
              o => o.article === a.person && o.date === a.date
            );
            if (match) match.annotation = a.annotation;
          });

        upload({ data: output, chart: '2018-top--appearance' })
          .then(() => resolve({ people, data }))
          .catch(reject);
      })
      .catch(reject);
  });
}

function liveChartAll({ people, data }) {
  return new Promise((resolve, reject) => {
    // filter the data to people that appear at least once in top 10
    // output: unique list of people
    const topPeople = uniq(
      data.filter(d => d.rank_people < LIMIT).map(d => d.article)
    );

    // filter all data to get individual days' data for those people
    const output = data.filter(d => topPeople.includes(d.article));

    upload({ data: output, chart: '2018-top--all' })
      .then(() => resolve({ people, data }))
      .catch(reject);
  });
}

function rollupScore(values) {
  let prev = 0;
  return values.map(v => {
    prev += v.score;
    return {
      ...v,
      score_sum: prev
    };
  });
}

function tallyChartScore({ people, data }) {
  return new Promise((resolve, reject) => {
    const ids = d3
      .nest()
      .key(d => d.article)
      .rollup(values => d3.sum(values.map(v => MAX_SCORE - v.rank_people)))
      .entries(data)
      .sort((a, b) => d3.descending(a.value, b.value))
      .slice(0, MAX_PEOPLE_TALLY)
      .map(d => d.key);

    // filter the data to people that are top 100 in cumulative score
    const filtered = data.filter(d => ids.includes(d.article));

    // add score
    const withScore = filtered.map(d => ({
      ...d,
      score: MAX_SCORE - d.rank_people
    }));

    const nested = d3
      .nest()
      .key(d => d.article)
      .rollup(rollupScore)
      .entries(withScore)
      .map(d => d.value);

    const flat = [].concat(...nested);

    upload({ data: flat, chart: '2018-tally--score' })
      .then(() => resolve({ people, data }))
      .catch(reject);
  });
}

function rollupViews(values) {
  let prev = 0;
  return values.map(v => {
    prev += v.views;
    return {
      ...v,
      views_sum: prev
    };
  });
}

function rollupAppearance(values) {
  let prev = 0;
  return values.map(v => {
    prev += v.rank_people < 10 ? 1 : 0;
    return {
      ...v,
      appearance_sum: prev
    };
  });
}

function tallyChartViews({ people, data }) {
  return new Promise((resolve, reject) => {
    const articleUnique = uniq(data, 'article').map(d => d.article);

    const articleDead = articleUnique.filter(d => {
      const match = people.find(p => p.article === d);
      if (match) return match.dead === 'true';
      return false;
    });

    const articleAlive = articleUnique.filter(d => {
      const match = people.find(p => p.article === d);
      if (match) return match.dead === 'false';
      return true;
    });

    // filter the data to people that are top 100 in cumulative score
    const filteredDead = data.filter(d => articleDead.includes(d.article));
    const filteredAlive = data.filter(d => articleAlive.includes(d.article));

    const nestedDead = d3
      .nest()
      .key(d => d.article)
      .rollup(rollupViews)
      .entries(filteredDead);

    const nestedAlive = d3
      .nest()
      .key(d => d.article)
      .rollup(rollupViews)
      .entries(filteredAlive);

    nestedDead.sort((a, b) => {
      const maxA = a.value[a.value.length - 1].views_sum;
      const maxB = b.value[b.value.length - 1].views_sum;
      return d3.descending(maxA, maxB);
    });

    nestedAlive.sort((a, b) => {
      const maxA = a.value[a.value.length - 1].views_sum;
      const maxB = b.value[b.value.length - 1].views_sum;
      return d3.descending(maxA, maxB);
    });

    const slicedDead = nestedDead.slice(0, MAX_PEOPLE_TALLY).map(d => d.value);
    const slicedAlive = nestedAlive
      .slice(0, MAX_PEOPLE_TALLY)
      .map(d => d.value);

    const flatDead = [].concat(...slicedDead);
    const flatAlive = [].concat(...slicedAlive);

    upload({ data: flatDead, chart: '2018-tally-views--dead' })
      .then(() => {
        upload({ data: flatAlive, chart: '2018-tally-views--alive' });
        resolve({ people, data });
      })
      .catch(reject);
  });
}

function tallyChartAppearance({ people, data }) {
  return new Promise((resolve, reject) => {
    const articleUnique = uniq(data, 'article').map(d => d.article);

    const articleDead = articleUnique.filter(d => {
      const match = people.find(p => p.article === d);
      if (match) return match.dead === 'true';
      return false;
    });

    const articleAlive = articleUnique.filter(d => {
      const match = people.find(p => p.article === d);
      if (match) return match.dead === 'false';
      return true;
    });

    // filter the data to people that are top 100 in cumulative score
    const filteredDead = data.filter(d => articleDead.includes(d.article));
    const filteredAlive = data.filter(d => articleAlive.includes(d.article));

    const nestedDead = d3
      .nest()
      .key(d => d.article)
      .rollup(rollupAppearance)
      .entries(filteredDead);

    const nestedAlive = d3
      .nest()
      .key(d => d.article)
      .rollup(rollupAppearance)
      .entries(filteredAlive);

    nestedDead.sort((a, b) => {
      const maxA = a.value[a.value.length - 1].appearance_sum;
      const maxB = b.value[b.value.length - 1].appearance_sum;
      return d3.descending(maxA, maxB);
    });

    nestedAlive.sort((a, b) => {
      const maxA = a.value[a.value.length - 1].appearance_sum;
      const maxB = b.value[b.value.length - 1].appearance_sum;
      return d3.descending(maxA, maxB);
    });

    const slicedDead = nestedDead.slice(0, MAX_PEOPLE_TALLY).map(d => d.value);
    const slicedAlive = nestedAlive
      .slice(0, MAX_PEOPLE_TALLY)
      .map(d => d.value);

    const flatDead = [].concat(...slicedDead);
    const flatAlive = [].concat(...slicedAlive);

    upload({ data: flatDead, chart: '2018-tally-appearance--dead' })
      .then(() => {
        upload({ data: flatAlive, chart: '2018-tally-appearance--alive' });
        resolve({ people, data });
      })
      .catch(reject);
  });
}

async function peopleInfo({ people, data }) {
  return new Promise(async (resolve, reject) => {
    loadPeopleWeb()
      .then(async peopleWebData => {
        const topPeople = uniq(
          data.filter(d => d.rank_people < LIMIT).map(d => d.article)
        );

        const withDetails = [];

        let index = 0;
        for (article of topPeople) {
          console.log(`${index + 1} of ${topPeople.length}: ${article}`);
          const match = people.find(p => p.article === article);
          await getDetails({ article, peopleWebData })
            .then(response => {
              const joined = { ...match, ...response };
              withDetails.push(joined);
            })
            .catch(err => {
              console.log(err);
              const joined = { ...match, article };
              withDetails.push(joined);
            });
          index += 1;
        }

        // fs.writeFileSync('./people.json', JSON.stringify(withDetails, null, 2));
        upload({ data: withDetails, chart: '2018-people' })
          .then(() => resolve({ people, data }))
          .catch(reject);
      })
      .catch(reject);
  });
}

async function breakoutChartScoring(data) {
  // filter down to people who didn't have a page in 2017 or 16
  const uniquePeople = uniq(data.map(d => d.article));
  const newPeople = [];

  for (article of uniquePeople) {
    console.log(article);
    await getOldPageviews(article)
      .then(exists => {
        if (!exists) newPeople.push(article);
      })
      .catch(console.log);
  }

  // just non 2017 people
  const filtered = data.filter(d => newPeople.includes(d.article));
  const withScore = filtered.map(d => ({
    ...d,
    score: MAX_SCORE - d.rank_people
  }));

  // group by article and add running tally
  const nested = d3
    .nest()
    .key(d => d.article)
    .rollup(values => {
      let tally = 0;
      values.map(v => {
        tally += v.score;
        return {
          ...v,
          running_score: tally
        };
      });
    })
    .entries(withScore);

  // flatten
  const flat = [].concat(...nested.map(d => d.value));
  upload({ data: flat, chart: '2018-breakout--scoring' })
    .then(() => resolve(data))
    .catch(reject);
}

function createChartData({ people, data }) {
  peopleInfo({ people, data })
    .then(liveChartAll)
    .then(liveChartAppearance)
    .then(tallyChartViews)
    .then(tallyChartAppearance)
    .catch(sendMail);

  // 	.then(breakoutChartRising)
  // 	.then(breakoutChartScoring)
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

function download({ year, month, day }) {
  return new Promise((resolve, reject) => {
    const t = new Date().getTime();
    const url = `https://pudding.cool/2018/08/wiki-billboard-data/top-1000/${year}-${month}-${day}.json?version=${t}`;
    request(url, (err, response, body) => {
      if (err) reject(err);
      else if (response && response.statusCode === 200) {
        const people = JSON.parse(body);
        resolve(people);
      } else reject(response.statusCode);
    });
  });
}

async function loadDays(people) {
  const dates = generateDates();
  const output = [];
  let error = null;
  for (const date of dates) {
    console.log(date);
    await download(date)
      .then(people => {
        output.push(people);
      })
      .catch(sendMail);
  }
  if (error) return Promise.reject(error);
  const data = [].concat(...output);

  if (dev) fs.writeFileSync('./prepare.json', JSON.stringify(data));
  // const data = JSON.parse(fs.readFileSync('./prepare.json', 'utf-8'));
  createChartData({ people, data });
}

function init(testing) {
  dev = testing;
  return new Promise((resolve, reject) => {
    loadPeople()
      .then(loadDays)
      .catch(sendMail);
  });
}

module.exports = init;
