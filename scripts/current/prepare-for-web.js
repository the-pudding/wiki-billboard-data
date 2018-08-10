const request = require('request');
const d3 = require('d3');
const uniq = require('lodash.uniqby');
const fs = require('fs');
const uploadToS3 = require('./upload-to-s3');
const sendMail = require('./send-mail');

const AWS_PATH = '2018/08/wiki-billboard-data/web';

function zeroPad(t) {
    return d3.format('02')(t);
  }


function liveChart(data) {
    const limit = 10;
    
    // filter the data to people that appear at least once in top 10
    // output: unique list of people
    const top10People = uniq(data.filter(d => d.rank_people < limit).map(d => d.article));
    
    // filter all data to get individual days' data for those people
    const output = data.filter(d => top10People.includes(d.article))
    fs.writeFileSync("./output/temp.csv",d3.csvFormat(output));
}

function createChartData(data) {
    liveChart(data);
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


function download({year,month,day}) {
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

async function loadDays(dates) {
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
    createChartData(data);
}

function init() {
  return new Promise((resolve, reject) => {
    const dates = generateDates();
    loadDays(dates);
    });
}

module.exports = init;
