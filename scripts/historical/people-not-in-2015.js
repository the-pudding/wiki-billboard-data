const fs = require('fs');
const mkdirp = require('mkdirp');
const request = require('request');
const d3 = require('d3');

const outputDir = './output/';

function init() {
    mkdirp(outputDir);
    
    const peopleDatabase = d3.csvParse(fs.readFileSync('./input/final-people.csv','utf-8'))
    const historicalRankings = d3.csvParse(fs.readFileSync('./output/historical-rankings.csv','utf-8'))

    const nestedRankings = d3.nest()
        .key(d => d.article)
        .entries(historicalRankings)

    const filteredRankings = nestedRankings.filter(d => {
        const match = peopleDatabase.find(p => p.article === d.key)
        return !!match
    })

    const peopleNotIn2015 = filteredRankings.filter(d => {
        const match = d.values.find(v => v.date.includes("2015"))
        return !match 
    })

    const multipleAppearances = peopleNotIn2015.filter(d => {
        return d.values.length > 1
    })

    const articles = multipleAppearances.map(d => ({
        article:d.key
    }))

    const formatted = d3.csvFormat(articles)

    fs.writeFileSync('./output/people-not-in-2015.csv', formatted);
  }
  
  init();