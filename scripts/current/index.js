const sendMail = require('./send-mail');
const getTodaysRankings = require('./get-todays-rankings');
const getPeople = require('./get-people');

function init() {
  getPeople()
    .then(getTodaysRankings)
    .then(() => {
      console.log('done');
      process.exit();
    })
    .catch(error => {
      console.log(error);
      sendMail(error);
      process.exit();
    });
}

init();
