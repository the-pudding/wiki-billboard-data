const fs = require('fs');
const mkdirp = require('mkdirp');
const request = require('request');
const d3 = require('d3');
const uniq = require('lodash.uniqby')
const cheerio = require('cheerio')

const outputDir = './output/';
const people = new Set()
const notPeople = new Set()

function checkIfPerson(article) {
    // console.log(article)
    return new Promise((resolve,reject) => {
        const person = people.has(article)
        if (person) resolve(person)
        else {
            const base = 'https://en.wikipedia.org/api/rest_v1/page/html';
            const url = `${base}/${encodeURI(article)}`;
            request(url, (error, response, body) => {
            if (error) reject(error);
            else if (response.statusCode === 200) {
                const $ = cheerio.load(body)
                const text = $('p').eq(1).text()
                const isBorn = text.includes("(born")
            // console.log(isBorn)
                if (isBorn) people.add(article)
                else notPeople.add(article)
                resolve(isBorn);
            } else reject(response.statusCode);
            });
        }
    }) 
}

async function init() {
    mkdirp(outputDir);

    const entities = d3.csvParse(fs.readFileSync('./output/historical-rankings.csv', "utf-8"));

    const peopleDatabase = d3.csvParse(fs.readFileSync('./output/people.csv', "utf-8"));

    const articles = entities.map(d => d.article)
    const unique = uniq(articles)

    peopleDatabase.forEach(d => people.add(d.link.replace("/wiki/","")))

    const output = []

    let i = 0
    for (article of unique) {
        console.log(i,unique.length)
        i++
        await checkIfPerson(article)
          .then((isPerson) => {
              if (isPerson) output.push(article)
            })
          .catch(console.error);
    }

    const finalPeople = output.map(article => ({article}))
    const formatted = d3.csvFormat(finalPeople)
    
    fs.writeFileSync('./output/final-people.csv', formatted);

  }
  
  init();