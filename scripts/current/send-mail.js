const nodemailer = require('nodemailer');

function sendMail(msg) {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASSWORD }
  });

  const mailOptions = {
    from: '"Wiki Billboard" <puddingherokunotify@gmail.com>',
    to: 'russell@polygraph.cool',
    subject: 'Issue with Wiki Billboard Data',
    text: msg
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.log(err);
    process.exit();
  });
}

module.exports = sendMail;
