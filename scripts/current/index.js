const sendMail = require('./send-mail');
const getTodaysRankings = require('./get-todays-rankings');
const getPeople = require('./get-people');

function init() {
  getPeople().then(getTodaysRankings);
}

init();
// prepareForWeb(true);
// getTodaysRankings();
