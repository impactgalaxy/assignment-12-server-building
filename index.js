require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const port = process.env.PORT || 5000;

const app = express()
app.use(cors())
app.use(express.json())
// sendMail 
const sendMail = async (receiver, message) => {
  const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.GMAIL,
    pass: process.env.GMAIL_PASS,
  },
  });
  
    const info = await transporter.sendMail({
    from: `Build Nest <${process.env.GMAIL}>`, // sender address
    to: `${receiver}`, // list of receivers
    subject: `${message} ✔`, // Subject line
    html: "Thanks for your kind referer", // html body
  });

  // console.log("Message sent: %s", info.messageId);
}
app.post("/sendMail", async (req, res) => {
    const { receiverEmail } = req.body;    
  const result = await sendMail(receiverEmail, "Registration")
  res.send({message: "Email send successfully", result})
})


app.get("/", (req, res) => res.send("Server for assignment 12 is running successfully..."));
app.listen(port, ()=> console.log("Server running on port: ", port))