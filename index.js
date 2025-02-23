const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000
require('dotenv').config()
const jwt = require('jsonwebtoken');


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
        const appointmentCollection = client.db("docDB").collection("appointments")
        const userCollection = client.db("docDB").collection("users")
        const localDoctorCollection = client.db("docDB").collection("localDoctors")

        //************************************************************* step2
        // The server creates a JWT token using the jwt.sign() function.
        // The token is then sent back to the frontend.
        // The frontend stores this token in localStorage
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })
        })
        //*************************************************************end step:2

        //*************************************************************step5
        //If the request does not contain a token → Return 401 Unauthorized.
        //If the token is invalid or expired → Return 401 Forbidden.
        //If the token is valid, the decoded user information (like email) is stored in req.decoded, and the request proceeds to verifyAdmin.
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) { //authorization data is sendfrom axiosSecure after getting the token from local storage
                return res.status(401).send({
                    message: 'unauthorized access'
                })
            }
            const token = req.headers.authorization.split(' ')[1] //token datatheke 'Bearer' bad diye just token data nibe
            //jwt token verify buldin process
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({
                        message: 'forbidden access'
                    })
                }
                req.decoded = decoded;
                next() //continue to whatever next/verifyToken -> verifyAdmin,
            })
        }
        //*************************************************************end step5

        //**************************************************************step6
        // Retrieves the user email from req.decoded.
        // Fetches the user details from the database (usersCollection).
        // Checks if the user has the admin role.
        // If not an admin → Return 403 Forbidden.
        // If admin → Proceed to the final API route.
        //use verifyAdmin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            //AuthProvider theke '/jwt' route call korar somoy 'userInfo' patano hoice
            //jeta decoder e store kora ache token verify korar por
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }
        //**************************************************************end step:6

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
        //get local doctors data from database
        app.get('/localDoctors', async (req, res) => {
            const localDoctors = await localDoctorCollection.find().toArray()
            res.send(localDoctors)
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
            const query = { category: category };
            const slot = await slotCollection.findOne(query);
            res.send(slot);
        });

        app.post('/appointments', async (req, res) => {
            const info = req.body;
            const { email, serviceName } = info;
            // Check if the appointment already exists for the user and service
            const existingAppointment = await appointmentCollection.findOne({ email, serviceName });
            if (existingAppointment) {
                return res.send({ message: "You already have an appointment for this service!" });
            }
            // Insert new appointment
            const result = await appointmentCollection.insertOne(info);
            res.send(result);
        });

        app.get('/myAppointments',verifyToken, async (req, res) => {
            const email = req.query.email
            const date = new Date(req.query.date).toDateString();
            const query = { email: email, selectedDate: date };
            const result = await appointmentCollection.find(query).toArray();
            res.send(result);
        });

        //post users
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        // get user
        app.get('/users',verifyToken,verifyAdmin,async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })
        //delete user
        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })
        //delete local doctor
        app.delete("/localDoctors/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await localDoctorCollection.deleteOne(query)
            res.send(result)
        })

        //admin admin in role
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)

        })

        // post localDoctor data
        app.post('/localDoctors', async (req, res) => {
            const localDoctor = req.body
            const result = await localDoctorCollection.insertOne(localDoctor)
            res.send(result)
        })

        //admin kina check kore admin er role er data er sathe milabe mile gele data patabe
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email //email AuthProvider er useEffect theke patano hoice
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

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