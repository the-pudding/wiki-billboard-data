const request = require('request');
const d3 = require('d3');
const uploadToS3 = require('./upload-to-s3');

const AWS_PATH = '2018/08/wiki-billboard-data/top-1000';

function extractPeople({ data, people }) {
  const { articles, year, month, day } = data.items[0];
  const filtered = articles.filter(d => people.includes(d.article));

  const date = `${year}-${month}-${day}`;
  const withDate = filtered.map((d, i) => ({
    ...d,
    rank_people: i,
    date
  }));
  return withDate;
}

function download({ year, month, day }) {
  const base =
    'https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access';
  const url = `${base}/${year}/${month}/${day}`;
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) reject(error);
      else if (response.statusCode === 200) {
        resolve(JSON.parse(body));
      } else reject(response.statusCode);
    });
  });
}

function zeroPad(t) {
  return d3.format('02')(t);
}

function generateDate() {
  const usec = 86400000;
  const current = new Date().getTime();
  const yesterday = new Date(current - usec);
  const year = yesterday.getFullYear();
  const month = zeroPad(yesterday.getMonth() + 1);
  const day = zeroPad(yesterday.getDate());
  console.log({ year, month, day });
  return { year, month, day };
}

function loadPeople() {
  return new Promise((resolve, reject) => {
    const t = new Date().getTime();
    const url = `https://pudding.cool/2018/08/wiki-billboard-data/people/all.csv?version=${t}`;
    request(url, (err, response, body) => {
      if (err) reject(err);
      else if (response && response.statusCode === 200) {
        const people = d3.csvParse(body).map(d => d.name.replace(/ /g, '_'));
        resolve(people);
      } else reject(response.statusCode);
    });
  });
}

function init() {
  return new Promise((resolve, reject) => {
    const date = generateDate();

    // download json
    download(date)
      .then(data => {
        loadPeople()
          .then(people => {
            const extractedPeople = extractPeople({ data, people });
            const path = `${AWS_PATH}/${date.year}-${date.month}-${date.day}`;
            const string = JSON.stringify(extractedPeople);
            uploadToS3({ string, path, ext: 'json' })
              .then(resolve)
              .catch(reject);
          })
          .catch(reject);
      })
      .catch(reject);
  });
}

module.exports = init;
