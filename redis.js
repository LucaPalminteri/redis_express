const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis")
const redisClient = Redis.createClient({
    host: '127.0.0.1',
    port: 6379
});

const app = express();
app.use(express.urlencoded({ extended: true }))
app.use(cors());


redisClient.connect();


const BASE_URL = "https://jsonplaceholder.typicode.com/photos";
const DEFAULT_EXPIRATION = 3600;
const PORT = 3000;

// app.listen(PORT, function () {
//     console.log(`Example app listening on port ${PORT}!`);
//   });

app.get("/", (req,res) => {
    res.send("Hello World!");
})

app.get("/photos", (req,res) => {
    redisClient.get('photos', async (error, photos) => {
        if(error) console.log(error);
        if (photos != null) return res.json(JSON.parse(photos)) 
        else {
            const {data} = await axios.get(BASE_URL)
            redisClient.setex("photos",DEFAULT_EXPIRATION, JSON.stringify(data))
            res.json(data)
        }
    })
})

app.get("/photos/:id", async (req, res) => {
    const photos = await getOrSetCache(`photos:${req.params.id}`, async () => {
        console.log("cheking");
        const { data } = await axios.get(`${BASE_URL}/${req.params.id}`)
        console.log(data);
        return data;
    })

    res.json(photos);
})

async function getOrSetCache(key, cb) {
    redisClient.get(key, async (error, data) => {
        
        console.log(data);
        if (error) return error
        if (data != null) return JSON.parse(data)
        const freshData = await cb()
        redisClient.setex(key, DEFAULT_EXPIRATION, (freshData))
        return freshData
    })
}

app.listen(PORT)