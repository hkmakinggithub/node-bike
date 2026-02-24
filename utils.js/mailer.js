const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user:  process.env.EMAIL_USER, // 👈 Put your garage's Gmail here
    pass: 'ebbcyjdvkxewmmeg' // 👈 Not your normal password! Use a Google App Password
  }
});

exports.sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: '"Bahuchar Infocare" harshsompura24@gmail.com',
      to,
      subject,
      text
    });
    console.log(`✉️ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Email failed to send:", error);
  }
};