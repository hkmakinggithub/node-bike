const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    // Falls back to your email if the .env variable is missing
    user: process.env.EMAIL_USER || 'harshsompura24@gmail.com', 
    pass: process.env.EMAIL_PASS || 'ebbcyjdvkxewmmeg' 
  }
});

exports.sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      // ✅ FIXED: Added the < > around the email address
      from: '"Bahuchar Infocare" <harshsompura24@gmail.com>', 
      to,
      subject,
      text
    });
    console.log(`✉️ Email sent successfully to ${to}`);
  } catch (error) {
    console.error("❌ Email failed to send:", error);
  }
};