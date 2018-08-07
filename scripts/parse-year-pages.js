const fs = require('fs');
const mkdirp = require('mkdirp');
const cheerio = require('cheerio');
const d3 = require('d3');

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
const outputDir = './output';
const inputDir = './output/year-pages';

function checkForDate(str) {
  const split = str.split(' ');
  const isMonth = MONTHS.includes(split[0]);
  const isDate = !isNaN(split[1]);
  return isMonth && isDate;
}

function parseLi({ sel, file }) {
  // if (sel.text().startsWith('Date unknown')) return null;

  const isPerson = !sel.find('ul').length;

  if (isPerson) {
    const a = sel.find('a');
    if (!a.length) return null;

    const firstA = a.first();
    const firstTitle = firstA.attr('title');
    const isDate = checkForDate(firstTitle);
    const name = isDate ? a.eq(1).attr('title') : firstTitle;
    const link = isDate ? a.eq(1).attr('href') : firstA.attr('href');

    const birth_year = file.substring(0,4);

    return {
      link,
      name,
      birth_year
    };
  }

  return null;
}

function checkValidStart(year, monthIndex) {
  if (+year === START.year && monthIndex < START.month) return false;
  return true;
}

function extractPeople(file) {
  const html = fs.readFileSync(`${inputDir}/${file}`, 'utf-8');
  console.log(file);
  const $ = cheerio.load(html);

  const births = $("#Births");
  if (!births.length) return [];
  const parent = births.parent();
  const next = parent.next();
  const tag = next.get(0).tagName;
  if (tag==="ul") {
    const output = [];
    next.find('li').each((i, el) => {
      const person = parseLi({ sel: $(el), file });
      if (person) output.push(person);
    });
  
    return output;
  }
  else {
    const peopleByMonth = MONTHS.map((month) => {
      const parent = $(`#${month}_2`).parent();
      const ul = parent.nextAll('ul').eq(0);

      const output = [];
      ul.find('li').each((i, el) => {
        const person = parseLi({ sel: $(el), file });
        if (person) output.push(person);
      });
      return output;
    });

    return [].concat(...peopleByMonth);
  }
}

function init() {
  const files = fs.readdirSync(inputDir).filter(d => d.includes('.html'));
  const peopleByYear = files.map(extractPeople);
  const flatPeople = [].concat(...peopleByYear);

  const output = d3.csvFormat(flatPeople);

  mkdirp(outputDir);
  fs.writeFileSync('./output/people.csv', output);
}

init();