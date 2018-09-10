const request = require('request');
const d3 = require('d3');
const uploadToS3 = require('./upload-to-s3');
const AWS_PATH = '2018/08/wiki-billboard-data/web';

function zeroPad(t) {
  return d3.format('02')(t);
}

function parseSheetDate(d) {
  const s = d.split('/');
  return `${s[2]}-${zeroPad(s[0])}-${zeroPad(s[1])}`;
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

function init() {
  downloadSheet({
    id: '1B7hymymVfsvb0EQ_7g5WjgrvuJpBLeVi4HJuz4eNi6k',
    gid: '1196667091'
  }).then(annotations => {
    const clean = annotations
      .filter(d => d.approved.toLowerCase() === 'true')
      .map(d => ({
        ...d,
        date: parseSheetDate(d.date)
      }));

    const string = d3.csvFormat(clean);
    const path = `${AWS_PATH}/2018-annotations`;
    uploadToS3({ string, path, ext: 'csv' })
      .then(() => {
        process.exit();
      })
      .catch(console.log);
  });
}

init();
