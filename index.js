require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const stripe = require("stripe")(process.env.STRIPE_SK);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const port = process.env.PORT || 5000;

const app = express();
const corsObj = {
  origin: ["http://localhost:5173"],
  methods: ['GET,POST,PUT,DELETE,PATCH,OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // allow credentials (cookies)
  }
app.use(cors(corsObj))
app.use(express.json())

// email transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.GMAIL,
    pass: process.env.GMAIL_PASS,
  },
  });

// sendMail 
const sendMail = async (receiver, message) => {
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
    const agreementsCollection = client.db("assignment_12").collection("agreements");
    const couponsCollection = client.db("assignment_12").collection("coupons");
    const paymentHistoryCollection = client.db("assignment_12").collection("paymentHistory");


    app.get("/apartments", async (req, res) => {
      const qu = req.query.pageNumber;
      const result = await apartmentsCollection.find().skip(qu *6).limit(6).toArray();
      res.send(result);
    })
    // single apartment
    app.get("/apartment/:id", async (req, res) => {
      const id = req.params.id;
      const findApartment = { _id: new ObjectId(id) };
      const result = await apartmentsCollection.findOne(findApartment)
      res.send(result);
    })
    // apartment count
    app.get("/apartmentsCount", async (req, res) => {
      const result = await apartmentsCollection.estimatedDocumentCount();
      res.send({result});
    })

    // user related api start
    app.post("/create-users", async (req, res) => {
      const userDoc = req.body;
      const result = await usersCollection.insertOne(userDoc);
      res.send(result);
    
    })
    // contracted api or agreement api
    app.post("/agreement-apartment", async (req, res) => {
      const agreementInfo = req.body;
      const {uid } = req.query;
      const isExist = await agreementsCollection.findOne({contractor_uid: uid });
      if (isExist) {
       return res.send({message: "You have already agreement for apartment this apartment"})
      }
      
      const result = await agreementsCollection.insertOne(agreementInfo);
      res.send(result);
    })
    app.get("/agreement-apartment", async (req, res) => {
      const result = await agreementsCollection.find().toArray()
      res.send(result);
    })
    // single request
    app.get("/agreement-apartment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { contractor_uid: id };
      const result = await agreementsCollection.findOne(query);
      res.send(result);
    })
    
    
    app.patch("/agreement-status", async (req, res) => {
      const { agreement_id, uid, status, role, isAccept, apartment_id } = req.query;
      const userQuery = { uid } 
      const apartmentQuery = { _id: new ObjectId(apartment_id) };
      const requestQuery = { _id: new ObjectId(agreement_id) };

      if (isAccept === "false") {
        const deleteRequest = await agreementsCollection.deleteOne(requestQuery)
        return res.send(deleteRequest);
      }
    
      const updateRole = {
        $set: {
          role: role,
        }
      }
      const result = await usersCollection.updateOne(userQuery, updateRole);    

      
      await apartmentsCollection.updateOne(apartmentQuery, {$set: {apartment_booked: "booked"}}, {upsert: true})

      

      const updateRequestQuery = {
        $set: {
          status,
          isAccept,
          accept_at: new Date().toUTCString()
        }
      }
      const result2 = await agreementsCollection.updateOne(requestQuery, updateRequestQuery, { upsert: true })
      
      res.send({result, result2})


    })


    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    })

    app.patch("/delete-member/:id", async (req, res) => {
      const doc = req.body;
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const changeRole = {
        $set: doc
      }
      const result = await usersCollection.updateOne(query, changeRole)
      res.send(result);

    })
    // user related api end


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
      const query = { _id: new ObjectId(id) }
      const result = await announcementsCollection.deleteOne(query);
      res.send(result)
    })
    app.get("/coupons", async (req, res) => {
      const result = await couponsCollection.find().toArray();
      res.send(result);
    })
    // get my coupon
    app.get("/getMyCoupon", async (req, res) => {
      const { id, uid } = req.query;
      
      console.log(uid);
      const updateDoc = {
        $set: {
          generate_coupon: true,
          generate_time: new Date().toUTCString()
        }
      }
      await usersCollection.updateOne({uid}, updateDoc, {upsert: true})
      const result = await couponsCollection.findOne({ id: id })
      res.send(result)
    })
    // app.get("/validate-coupon", async (req, res) => {
    //   const { coupon_code } = req.query;
      
    //   const result = await couponsCollection.findOne({coupon_code})
    //   res.send(result);
    // })
    app.post("/create-coupons", async (req, res) => {
      const couponDoc = req.body;
      const result = await couponsCollection.insertOne(couponDoc)
      res.send(result);
    })
    app.get("/count-coupons", async (req, res) => {
      const result = await couponsCollection.estimatedDocumentCount();
      res.send({ result });
    })

    // calculate payment price
    const calculatePrice = async( coupon_code, price) => {
           
      const result = await couponsCollection.findOne({ coupon_code })
      if (result === null) {
        return price * 100;
      } else {
        const discountPrice = price - (result.discount / 100) * price;
        return discountPrice * 100;
      }
    }
// make payment
    app.post("/create-payment-intent", async (req, res) => {
      const { coupon_code, price } = req.body;
      const payablePrice = await calculatePrice(coupon_code, price);
      
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({  
      
    amount: payablePrice,
    currency: "usd",
    // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
    automatic_payment_methods: {
      enabled: true,
    },
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
    payablePrice
    
  });
  });
    // save payment history
    app.post("/payment-history", async (req, res) => {
      const {  history } = req.body;      
      const paymentHistory = await paymentHistoryCollection.insertOne(history)
      res.send(paymentHistory)
    })
    // retrieve history by client
    app.get("/payment-history", async (req, res) => {
      const { uid, month } = req.query;
      console.log(uid, month);
      let query = {}
      if (month) {
        query = {uid, month}
      } else {
        query = {uid}
      }
      const result = await paymentHistoryCollection.find(query).toArray();      
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