const knox = require('knox');

const AWS_KEY = process.env.AWS_KEY;
const AWS_SECRET = process.env.AWS_SECRET;
const AWS_BUCKET = process.env.AWS_BUCKET;

const client = knox.createClient({
  key: AWS_KEY,
  secret: AWS_SECRET,
  bucket: AWS_BUCKET
});

function uploadToS3({ string, path, ext = 'json' }) {
  return new Promise((resolve, reject) => {
    let contentType = null;

    if (ext === 'html') contentType = 'text/html';
    else if (ext === 'json') contentType = 'application/json';
    else if (ext === 'csv') contentType = 'text/csv';

    const req = client.put(`${path}.${ext}`, {
      'Content-Length': Buffer.byteLength(string),
      'Content-Type': contentType
    });

    req.on('response', res => {
      if (res.statusCode === 200) {
        console.log('saved to %s', req.url);
        resolve();
      } else reject(res.statusCode);
    });

    req.end(string);
  });
}

module.exports = uploadToS3;
