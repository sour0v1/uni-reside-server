const express = require('express');
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_SK)
const port = process.env.PORT || 5000

// middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://uni-reside.web.app', 'https://uni-reside.firebaseapp.com'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

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

// middleware
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    // console.log(token);
    if (!token) {
        return res.status(401).send('unauthorized access')
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send('forbidden access');
        }
        // console.log(decoded)
        req.user = decoded;
        next();
    })

}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
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
        const upcomingMealsCollection = database.collection('upcomingMeals');
        const upMealLikeCollection = database.collection('upMealLikes');

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"

        }
        const verifyAdmin = async (req, res, next) => {
            // console.log('user -', req.user.email)
            const query = { email: req.user.email };
            const result = await userCollection.findOne(query);
            // console.log(result?.role)
            if (result?.role !== 'admin') {
                return res.status(403).send('forbidden access');
            }
            next();
        }
        // jwt api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.cookie('token', token, cookieOptions)
                .send({ success: true })
        })
        app.post('/remove-token', async (req, res) => {
            res.clearCookie('token', {...cookieOptions, maxAge: 0 }).send({ success: true })
        })
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
            // console.log(searchQuery.length)
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
        app.get('/filter-by-price', async (req, res) => {
            const filterValue = req.query.priceValue;
            // console.log(filterValue);
            let highestPrice;
            let lowestPrice;
            if (filterValue === 'first') {
                highestPrice = 20;
                lowestPrice = 0;
            }
            if (filterValue === 'second') {
                highestPrice = 40;
                lowestPrice = 20;
            }
            if (filterValue === 'third') {
                highestPrice = 80;
                lowestPrice = 40;
            }
            if (filterValue === 'fourth') {
                highestPrice = Infinity;
                lowestPrice = 80;
            }
            // console.log(typeof highestPrice)
            const query = {
                price: { $gte: lowestPrice, $lte: highestPrice }
            }
            if (filterValue === 'category') {
                const result = await addedMealCollection.find().toArray();
                res.send(result);
                return;
            }
            const result = await addedMealCollection.find(query).toArray();
            res.send(result);
            // console.log(result);
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
        app.get('/meal', async (req, res) => {
            const { id } = req.query;
            const query = { _id: new ObjectId(id) };
            const result = await addedMealCollection.findOne(query);
            res.send(result);
        })
        // done
        app.get('/all-category-meals', async (req, res) => {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            const skip = (page - 1) * limit

            const result = await addedMealCollection.find().skip(skip).limit(limit).toArray();
            const totalMeals = await addedMealCollection.countDocuments();
            const hasMore = skip + limit < totalMeals;
            res.send({ result, hasMore })

            // console.log(page, limit);
        })
        // done
        app.get('/user', verifyToken, async (req, res) => {
            const { userEmail } = req.query;
            const query = { email: userEmail }
            const result = await userCollection.findOne(query);
            res.send(result);
        })
        app.post('/upcoming-meal', async (req, res) => {
            const mealInfo = req.body;
            const result = await upcomingMealsCollection.insertOne(mealInfo);
            res.send(result);
        })
        app.get('/up-meals', verifyToken, verifyAdmin, async (req, res) => {
            const result = await upcomingMealsCollection.find().toArray();
            res.send(result);
        })
        app.get('/review-count', async (req, res) => {
            const { id } = req.query;
            const query = { mealId: id };
            const result = await reviewCollection.find(query).toArray();
            // console.log(result.length);
            res.send({ length: result.length });
        })
        app.get('/requested-meals', verifyToken, async (req, res) => {
            const { email } = req.query;
            // console.log(email);
            const query = { userEmail: email };
            const result = await requestedMealCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/reviews', verifyToken, async (req, res) => {
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
        app.get('/get-payment-history', verifyToken, async (req, res) => {
            const { userEmail } = req.query;
            const query = { email: userEmail };
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/testimonials', async (req, res) => {
            const result = await testimonialCollection.find().toArray();
            res.send(result);
        })
        app.get('/meal-length', async (req, res) => {
            const email = req.query.email;
            const query = { adminEmail: email };
            const result = await addedMealCollection.find(query).toArray();
            const length = result?.length;
            res.send({ length });
        })
        app.get('/all-users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.get('/user-search', async (req, res) => {
            const { searchValue } = req.query;
            // console.log(searchValue);
            const searchQuery = {
                $or: [
                    { email: { $regex: new RegExp(searchValue, 'i') } },
                    { name: { $regex: new RegExp(searchValue, 'i') } }
                ]
            }
            const result = await userCollection.find(searchQuery).toArray();
            res.send(result);
        })
        app.get('/isAdmin', async (req, res) => {
            const { email } = req.query;
            const query = { email: email }
            const result = await userCollection.findOne(query);
            // console.log(result?.role);
            if (result?.role === 'admin') {
                return res.send({ isAdmin: true })
            }
            return res.send({ isAdmin: false })

        })
        app.get('/requested-meal-search', async (req, res) => {
            const { searchValue } = req.query;
            // console.log(searchValue);
            const searchQuery = {
                $or: [
                    { userEmail: { $regex: new RegExp(searchValue, 'i') } },
                    { userName: { $regex: new RegExp(searchValue, 'i') } }
                ]
            }
            const result = await requestedMealCollection.find(searchQuery).toArray();
            res.send(result);
        })
        app.get('/user-reviews', verifyToken, verifyAdmin, async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })
        app.get('/all-meals', verifyToken, verifyAdmin, async (req, res) => {
            const result = await addedMealCollection.find().toArray();
            res.send(result);
        })
        app.get('/all-requested-meals', async (req, res) => {
            const result = await requestedMealCollection.find().toArray();
            res.send(result);
        })
        app.get('/upcoming-meals', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 9;
            // console.log(page, limit);
            const skip = (page - 1) * limit
            // console.log(page, limit, skip);
            const result = await upcomingMealsCollection.find().skip(skip).limit(limit).toArray();
            const totalMeals = await upcomingMealsCollection.countDocuments();
            const totalPage = Math.ceil(totalMeals / limit);
            res.send({ result, totalPage })
            // console.log(totalMeals, totalPage);
        })
        app.get('/user-badge', async (req, res) => {
            const { userEmail } = req.query;
            // console.log(userEmail);
            const query = { email: userEmail }
            const result = await userCollection.findOne(query)
            // console.log(result?.email);
            res.send({ badge: result?.badge })

        })
        app.post('/up-to-add', verifyToken, verifyAdmin, async (req, res) => {
            const { id } = req.query;
            const query = { _id: new ObjectId(id) }
            const getMealInfo = await upcomingMealsCollection.findOne(query);
            // console.log(getMealInfo);
            const insertMeal = await addedMealCollection.insertOne(getMealInfo);
            // console.log(insertMeal);
            if (insertMeal.insertedId) {
                const deleteMeal = await upcomingMealsCollection.deleteOne(query);
                // console.log(deleteMeal);
                res.send(insertMeal);
            }
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
        app.post('/up-like', async (req, res) => {
            const { id, userEmail } = req.query;
            const singleQuery = { _id: new ObjectId(id) }
            const options = { upsert: true }
            // console.log(id, userEmail);
            const mealInfo = {
                mealId: id,
                email: userEmail
            }
            const query = {
                mealId: id,
                email: userEmail
            }
            const findUpLikeInfo = await upMealLikeCollection.findOne(query);
            // console.log(findUpLikeInfo)
            if (findUpLikeInfo) {
                return res.send({ message: 'Already liked the meal' })
            }

            const insertUpLikeInfo = await upMealLikeCollection.insertOne(mealInfo);
            // console.log(insertUpLikeInfo)
            if (insertUpLikeInfo.insertedId) {
                const updateUpMealLike = await upcomingMealsCollection.updateOne(singleQuery, {
                    $inc: {
                        likes: 1
                    }
                }, options)
                // console.log(updateUpMealLike)
                if (updateUpMealLike.modifiedCount) {
                    res.send({ message: 'Like Added' })
                }
            }

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
            // console.log(like);
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
        app.post('/add-meals', verifyToken, verifyAdmin, async (req, res) => {
            const mealInfo = req.body;
            const result = await addedMealCollection.insertOne(mealInfo);
            res.send(result);
            // console.log(mealInfo);
        })

        app.post('/review', verifyToken, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
            // console.log(review)
        })
        app.patch('/update-user', verifyToken, async (req, res) => {
            const { email, updatedBadge } = req.query;
            const query = { email: email };
            const updatedField = {
                $set: {
                    badge: updatedBadge
                }
            }
            const result = await userCollection.updateOne(query, updatedField);
            res.send(result);
        })
        app.put('/update-meal', async (req, res) => {
            const mealInfo = req.body;
            // console.log(mealInfo);
        })
        app.put('/update-status', async (req, res) => {
            const { id, email } = req.query;
            // console.log(id, email)
            const query = {
                mealId: id,
                userEmail: email
            };
            const updatedStatus = {
                $set: {
                    status: 'delivered'
                }
            }
            const result = await requestedMealCollection.updateOne(query, updatedStatus);
            res.send(result);

        })
        app.put('/edit-reviews', verifyToken, async (req, res) => {
            const { id, value } = req.query;
            // console.log(id)
            const query = { _id: new ObjectId(id) }
            const updatedReview = {
                $set: {
                    review: value
                }
            }
            const result = await reviewCollection.updateOne(query, updatedReview)
            res.send(result)
        })
        app.put('/update-user', verifyToken, verifyAdmin, async (req, res) => {
            const { email } = req.query;
            // console.log(email)
            const query = { email: email }
            const options = { upsert: true }
            const updatedUser = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(query, updatedUser, options);
            res.send(result);
        })
        app.delete('/delete-meal', async (req, res) => {
            const { id } = req.query;
            const query = { _id: new ObjectId(id) }
            const result = await addedMealCollection.deleteOne(query);
            res.send(result)
        })
        app.delete('/delete-review', verifyToken, verifyAdmin, async (req, res) => {
            const { id } = req.query;
            const query = { _id: new ObjectId(id) }
            const result = await reviewCollection.deleteOne(query);
            res.send(result)
        })
        app.delete('/delete-request', verifyToken, async (req, res) => {
            const { id } = req.query;
            const query = { _id: new ObjectId(id) }
            const result = await requestedMealCollection.deleteOne(query);
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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