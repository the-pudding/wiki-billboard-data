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
            const formatted = JSON.stringify(result.items)
            fs.writeFileSync(`./output/people-pageviews/${article}.json`,formatted);
            resolve();
        })
        .catch(reject);
    });
  }

async function init() {

    mkdirp('./output/people-pageviews/')

    const people = d3.csvParse(fs.readFileSync('./output/people-not-in-2015.csv','utf-8'))

    let i = 0
    for (person of people) {
        console.log(i)
        i++
        await getPageviews(person.article)
          .then(() => {})
          .catch(console.error);
    }

}

init()