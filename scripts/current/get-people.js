const d3 = require('d3');
const wiki = require('wikijs').default;
const cheerio = require('cheerio');
const uploadToS3 = require('./upload-to-s3');
const sendMail = require('./send-mail');

const AWS_PATH = '2018/08/wiki-billboard-data/people';
const START_YEAR = 1900;
const date = new Date();
const END_YEAR = date.getFullYear();

const years = d3.range(START_YEAR, END_YEAR + 1);

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function checkForDate(str) {
  const split = str.split(' ');
  const isMonth = MONTHS.includes(split[0]);
  const isDate = !isNaN(split[1]);
  return isMonth && isDate;
}

function parseLi({ sel, year }) {
  const isPerson = !sel.find('ul').length;

  if (isPerson) {
    const a = sel.find('a');
    if (!a.length) return null;

    const firstA = a.first();
    const firstTitle = firstA.attr('title');
    const isDate = checkForDate(firstTitle);
    const name = isDate ? a.eq(1).attr('title') : firstTitle;
    const link = isDate ? a.eq(1).attr('href') : firstA.attr('href');

    const birth_year = year;

    return {
      link,
      name,
      birth_year
    };
  }

  return null;
}

function extractPeople({ html, year }) {
  const $ = cheerio.load(html);

  const births = $('#Births');
  if (!births.length) return [];
  const parent = births.parent();
  const next = parent.next();
  const tag = next.get(0).tagName;
  if (tag === 'ul') {
    const output = [];
    next.find('li').each((i, el) => {
      const person = parseLi({ sel: $(el), year });
      if (person) output.push(person);
    });

    return output;
  } else {
    const peopleByMonth = MONTHS.map(month => {
      const parent = $(`#${month}_2`).parent();
      const ul = parent.nextAll('ul').eq(0);

      const output = [];
      ul.find('li').each((i, el) => {
        const person = parseLi({ sel: $(el), year });
        if (person) output.push(person);
      });
      return output;
    });

    return [].concat(...peopleByMonth);
  }
}

function download(year) {
  return new Promise((resolve, reject) => {
    wiki()
      .page(year)
      .then(page => page.html())
      .then(html => extractPeople({ html, year }))
      .then(resolve)
      .catch(reject);
  });
}

async function getPeopleByYear() {
  const output = [];
  let error = null;
  for (const year of years) {
    console.log(year);
    await download(year)
      .then(people => {
        output.push(people);
      })
      .catch(sendMail);
  }
  if (error) return Promise.reject(error);
  return [].concat(...output);
}

function upload(data) {
  return new Promise((resolve, reject) => {
    const string = d3.csvFormat(data);
    const path = `${AWS_PATH}/all`;
    uploadToS3({ string, path, ext: 'csv' })
      .then(resolve)
      .catch(reject);
  });
}

async function init() {
  await getPeopleByYear()
    .then(upload)
    .then(console.log)
    .catch(sendMail);

  return true;
}

module.exports = init;
