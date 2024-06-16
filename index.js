const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_SK)
const port = process.env.PORT || 5000

// middleware
app.use(cors());
app.use(express.json());

// mongodb connection

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xhnq0hd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        const database = client.db('uniReside');
        // database collection
        const addedMealCollection = database.collection('addedMeals');
        const likeCollection = database.collection('likes');
        const userCollection = database.collection('users');
        const requestedMealCollection = database.collection('requestedMeals');
        const reviewCollection = database.collection('reviews');
        const membershipCollection = database.collection('membership');
        const paymentCollection = database.collection('payments');
        const testimonialCollection = database.collection('testimonials');

        // done
        app.get('/meals-by-category/:category', async (req, res) => {
            const mealCategory = req.params.category;
            const query = { category: mealCategory }
            const result = await addedMealCollection.find(query).toArray();
            res.send(result);
            // console.log(mealCategory);
        })
        // done
        app.get('/search-meals/:query', async (req, res) => {
            const searchQuery = req.params.query;
            const filter = {
                $or: [
                    {
                        title: { $regex: searchQuery, $options: 'i' }
                    }
                ]
            }
            const result = await addedMealCollection.find(filter).toArray();
            res.send(result);
            // console.log(result);
            // console.log(searchQuery);
        })
        // done
        app.get('/filter-by-category/:filter', async (req, res) => {
            const filterValue = req.params.filter;
            // console.log(filterValue);
            const query = { category: filterValue }
            // console.log(query)
            if (filterValue === 'category') {
                const result = await addedMealCollection.find().toArray();
                res.send(result);
                return;
            }
            const result = await addedMealCollection.find(query).toArray();
            res.send(result);
        })
        // done
        app.get('/meals-by-category', async (req, res) => {
            const mealCategory = req.query.category;
            const query = { category: mealCategory }
            if (mealCategory === 'all') {
                const result = await addedMealCollection.find().toArray();
                res.send(result);
                return;
            }
            const result = await addedMealCollection.find(query).toArray();
            res.send(result);
            // console.log(mealCategory);
        })
        // done
        app.get('/meal/details', async (req, res) => {
            const { id } = req.query;
            // console.log('query', id);
            const query = { _id: new ObjectId(id) }
            const result = await addedMealCollection.findOne(query)
            res.send(result);
        })
        // TODO
        app.get('/all-category-meals', async (req, res) => {
            const page = parseInt(req.query.page);
            const limit = parseInt(req.query.limit);

            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;

            const result = await addedMealCollection.find().toArray();
            const finalResult = result.slice(startIndex, endIndex);
            res.send(finalResult);
            // console.log(page, limit);
        })
        // done
        app.get('/user', async (req, res) => {
            const { userEmail } = req.query;
            const query = { email: userEmail }
            const result = await userCollection.findOne(query);
            res.send(result);
        })
        app.get('/review-count', async (req, res) => {
            const { id } = req.query;
            const query = { mealId: id };
            const result = await reviewCollection.find(query).toArray();
            // console.log(result.length);
            res.send({ length: result.length });
        })
        app.get('/requested-meals', async (req, res) => {
            const { email } = req.query;
            // console.log(email);
            const query = { userEmail: email };
            const result = await requestedMealCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/reviews', async (req, res) => {
            const { email } = req.query;
            // console.log(email);
            const query = { userEmail: email };
            const result = await reviewCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/membership', async (req, res) => {
            const { membership } = req.query;
            // console.log(membership);
            const query = { package: membership }
            const result = await membershipCollection.findOne(query);
            res.send(result);
        })
        app.get('/get-payment-history', async (req, res) => {
            const {userEmail} = req.query;
            const query = {email : userEmail};
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/testimonials', async(req, res) => {
            const result = await testimonialCollection.find().toArray();
            res.send(result);
        })
        app.get('/meal-length', async(req, res) => {
            const email = req.query.email;
            const query = {adminEmail : email};
            const result = await addedMealCollection.find(query).toArray();
            const length = result?.length;
            res.send({length});
        })
        app.get('/all-users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.get('/user-search', async (req, res) => {
            const {searchValue} = req.query;
            // console.log(searchValue);
            const searchQuery = {
                $or : [
                    {email : {$regex : new RegExp(searchValue, 'i')}},
                    {name : {$regex : new RegExp(searchValue, 'i')}}
                ]
            }
            const result  = await userCollection.find(searchQuery).toArray();
            res.send(result);
        })
        app.get('/requested-meal-search', async (req, res) => {
            const {searchValue} = req.query;
            // console.log(searchValue);
            const searchQuery = {
                $or : [
                    {userEmail : {$regex : new RegExp(searchValue, 'i')}},
                    {userName : {$regex : new RegExp(searchValue, 'i')}}
                ]
            }
            const result  = await requestedMealCollection.find(searchQuery).toArray();
            res.send(result);
        })
        app.get('/user-reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })
        app.get('/all-meals', async (req, res) => {
            const result = await addedMealCollection.find().toArray();
            res.send(result);
        })
        app.get('/all-requested-meals', async (req, res) => {
            const result = await requestedMealCollection.find().toArray();
            res.send(result);
        })
        // stripe
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.query;
            const amount = parseInt(price * 100);
            // console.log(amount);
            if (amount) {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                });
                res.send({
                    clientSecret: paymentIntent.client_secret
                })
            }

        })
        app.post('/payment-history', async (req, res) => {
            const paymentInfo = req.body;
            // console.log(paymentInfo);
            const result = await paymentCollection.insertOne(paymentInfo);
            res.send(result);
        })
        // like - done
        app.post('/like', async (req, res) => {
            const { mealId, userEmail } = req.query;
            const query1 = { _id: new ObjectId(mealId) }
            const likeInfo = {
                mealId, userEmail
            }
            // console.log(id, userEmail);
            const query = { mealId: mealId, userEmail: userEmail }
            const like = await likeCollection.findOne(query);
            const options = { upsert: true }
            // console.log(like);
            if (like) {
                return res.send({ message: 'Already liked this meal' })
            }
            await likeCollection.insertOne(likeInfo)
            await addedMealCollection.updateOne(query1, {
                $inc: {
                    likes: 1
                }
            }, options)
            res.send({ message: 'Like added' });
        })
        // like - done
        app.post('/request', async (req, res) => {
            const { mealId, userEmail } = req.query;
            const likeInfo = {
                mealId, userEmail, ...req.body
            }
            // console.log(id, userEmail);
            const query = { mealId: mealId, userEmail: userEmail }
            const like = await requestedMealCollection.findOne(query);
            console.log(like);
            if (like) {
                return res.send({ message: 'Already requested' })
            }
            await requestedMealCollection.insertOne(likeInfo)
            res.send({ message: 'Request sent' });
        })
        // done
        app.post('/create-user', async (req, res) => {
            const userInfo = req.body;
            // console.log(userInfo);
            const result = await userCollection.insertOne(userInfo);
            res.send(result);
        })

        // done
        app.post('/add-meals', async (req, res) => {
            const mealInfo = req.body;
            const result = await addedMealCollection.insertOne(mealInfo);
            res.send(result);
            // console.log(mealInfo);
        })

        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
            // console.log(review)
        })
        app.patch('/update-user', async (req, res) => {
            const {email, updatedBadge} = req.query;
            const query = {email : email};
            const updatedField = {
                $set : {
                    badge : updatedBadge
                }
            }
            const result = await userCollection.updateOne(query, updatedField);
            res.send(result);
        })
        app.put('/update-status', async (req, res) => {
            const {id, email} = req.query;
            console.log(id, email)
            const query = {
                mealId : id,
                userEmail : email
            };
            const updatedStatus = {
                $set : {
                    status : 'delivered'
                }
            }
            const result = await requestedMealCollection.updateOne(query, updatedStatus);
            res.send(result);

        })
        app.put('/update-user', async (req, res) => {
            const {email} = req.query;
            console.log(email)
            const query = {email : email}
            const options = {upsert : true}
            const updatedUser = {
                $set : {
                    role : 'admin'
                }
            }
            const result = await userCollection.updateOne(query, updatedUser, options);
            res.send(result);
        })

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
    res.send('UniReside is running')
})
app.listen(port, () => {
    console.log(`UniReside is running on port ${port}`)
})