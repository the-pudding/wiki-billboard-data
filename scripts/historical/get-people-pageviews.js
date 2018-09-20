const d3 = require('d3');
const fs = require('fs');
const mkdirp = require('mkdirp');
const pageviews = require('pageviews');

function getPageviews(article) {
  return new Promise((resolve, reject) => {
    pageviews
      .getPerArticlePageviews({
        project: 'en.wikipedia',
        agent: 'user',
        granularity: 'daily',
        start: `20150701`,
        end: `20180913`,
        article
      })
      .then(result => {
        const formatted = JSON.stringify(result.items);
        fs.writeFileSync(
          `./output/people-pageviews/${article}.json`,
          formatted
        );
        resolve();
      })
      .catch(reject);
  });
}

function consolidatePeople(people) {
  // create list of duplicates to remove
  const commas = people
    .filter(d => d.article.includes(','))
    .map(d => {
      // look for non comma
      const match = people.find(p => p.article === d.article.replace(',', ''));
      return match ? match.article : null;
    })
    .filter(d => d);

  const noCommaDupes = people.filter(d => !commas.includes(d.article));

  const cleanCommas = noCommaDupes.map(d => ({
    ...d,
    article: d.article.replace(/_(J|S)r\./, (m, g) => `_${g}r.`)
  }));

  return cleanCommas;
}

function addVariations(people) {
  const output = [];
  people.forEach(d => {
    output.push({ ...d });
    if (d.article.includes('_Jr.') || d.article.includes('_Sr.')) {
      output.push({
        ...d,
        article: d.article.replace(/_(J|S)r\./, (m, g) => `,_${g}r.`)
      });
      output.push({
        ...d,
        article: d.article.replace(/_(J|S)r\./, (m, g) => `,_${g}r`)
      });

      output.push({
        ...d,
        article: d.article.replace(/_(J|S)r\./, (m, g) => `_${g}r`)
      });
    } else if (d.article.includes(',')) {
      output.push({
        ...d,
        article: d.article.replace(/,/g, '')
      });
    }
  });
  return output;
}

async function init() {
  mkdirp('./output/people-pageviews/');

  const people = d3.csvParse(
    fs.readFileSync('./output/people-not-in-2015.csv', 'utf-8')
  );
  const uniquePeople = consolidatePeople(people);
  const peopleVarations = addVariations(uniquePeople);

  let i = 0;
  for (person of peopleVarations) {
    console.log(i);
    i++;
    await getPageviews(person.article)
      .then(() => {})
      .catch(console.error);
  }
}

init();
