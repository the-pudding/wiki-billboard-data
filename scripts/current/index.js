const sendMail = require('./send-mail');
const getTodaysRankings = require('./get-todays-rankings');
const getPeople = require('./get-people');

function init() {
  // getPeople()
  // .then(getTodaysRankings)
  getTodaysRankings()
    .then(() => {
      console.log('done');
      // todo compile results
      process.exit();
    })
    .catch(error => {
      console.log(error);
      sendMail(error);
    });
}

init();
