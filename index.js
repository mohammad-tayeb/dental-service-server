const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()


//middleware
app.use(cors());
app.use(express.json())


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.z0jqk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        await client.connect();
        const reviewCollection = client.db("docDB").collection("reviews")
        const doctorCollection = client.db("docDB").collection("doctors")
        const slotCollection = client.db("docDB").collection("slots")

        //get review data from database
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewCollection.find().toArray()
            res.send(reviews)
        })

        //get doctors data from database
        app.get('/doctors', async (req, res) => {
            const doctors = await doctorCollection.find().toArray()
            res.send(doctors)
        })
        //get single doctor data from database
        app.get('/doctors/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const doctor = await doctorCollection.findOne(query)
            res.send(doctor)
        })
        // GET API for fetching slots by category
        app.get('/slots/:category', async (req, res) => {
            const category = req.params.category;
            console.log(category)
            const query = { category: category };
            const slot = await slotCollection.findOne(query);

            res.send(slot);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('doctor is not taking patients')
})

app.listen(port, () => {
    console.log(`doctor is live at: ${port}`)
})