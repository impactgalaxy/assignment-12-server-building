require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const port = process.env.PORT || 5000;

const app = express();
const corsObj = {
    origin: [
      "http://localhost:5173",
  ],
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true // allow credentials (cookies)
  }
app.use(cors(corsObj))
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


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.s7sbkwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const apartmentsCollection = client.db("assignment_12").collection("apartments");
    const usersCollection = client.db("assignment_12").collection("users");
    const announcementsCollection = client.db("assignment_12").collection("announcements");


    app.get("/apartments", async (req, res) => {
      const qu = req.query.pageNumber;
      const result = await apartmentsCollection.find().skip(qu *6).limit(6).toArray();
      res.send(result);
    })
    app.get("/apartmentsCount", async (req, res) => {
      const result = await apartmentsCollection.estimatedDocumentCount();
      res.send({result});
    })
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    // admin api only
    app.post("/announcements", async (req, res) => {
      const message = req.body;
      const result = await announcementsCollection.insertOne(message);
      res.send(result);
    })
    app.get("/announcements", async (req, res) => {
      const result = await announcementsCollection.find().toArray();
      res.send(result);
    })
    app.delete("/delete-announcement/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }
      const result = await announcementsCollection.deleteOne(query);
      res.send(result)
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => res.send("Server for assignment 12 is running successfully..."));
app.listen(port, ()=> console.log("Server running on port: ", port))