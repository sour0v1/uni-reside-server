const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
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
        const likeCollection = database.collection('likes')


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
            console.log(result);
            // console.log(searchQuery);
        })
        // done
        app.get('/filter-by-category/:filter', async (req, res) => {
            const filterValue = req.params.filter;
            console.log(filterValue);
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
        app.post('/check-like', async (req, res) => {
            const { id, email } = req.query;
            console.log(id, email);
            const query = { likedId: id };
            const findLike = await likeCollection.findOne(query);
            console.log(findLike);
            if (findLike === null) {
                const likeInfo = {
                    likedId: id, email
                }
                const result = await likeCollection.insertOne(likeInfo);
                // console.log(result);
                res.send(result);
            }
            else if(email === findLike?.email){
                res.send({isLiked : true});
            }

        })
        // done
        app.put('/update/meal', async (req, res) => {
            const { id, email, like } = req.query;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedMeal = {
                $inc: {
                    likes: 1,
                    
                },
                $set : {
                    isLiked : true
                }
            }
            const result = await addedMealCollection.updateOne(query, updatedMeal, options)
            console.log(result);
            res.send(result);
        })
        // done
        app.post('/add-meals', async (req, res) => {
            const mealInfo = req.body;
            const result = await addedMealCollection.insertOne(mealInfo);
            res.send(result);
            // console.log(mealInfo);
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