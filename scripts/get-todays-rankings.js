const fs = require('fs');
const request = require('request');
const d3 = require('d3');

const people = d3
  .csvParse(fs.readFileSync('./output/people.csv', 'utf-8'))
  .map(d => d.name.replace(/ /g, '_'));

function extractPeople(data) {

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
    const current = (new Date()).getTime();
    const yesterday = new Date(current-usec);
    const year = yesterday.getFullYear();
    const month = zeroPad(yesterday.getMonth() + 1);
    const day = zeroPad(yesterday.getDate());
    return {year,month,day};
}

function init() {

  // create an arry of every single date since the start of wiki api
  const date = generateDate();

  // download json for each day
  download(date)
    .then(d => {
        const extractedPeople = extractPeople(d)
        console.log(extractedPeople)
    })
    .catch(error => {
        console.log(error) 
        // to-do: email
    });

}

init();
