let express = require('express');
let redis = require('redis');
let axios = require('axios')
let port = 8090
let app = express();


let redisClient;
(
    async () => {
        try{
            redisClient = redis.createClient();
            redisClient.on('error', (error) => {
                console.log(error);
            })
            await redisClient.connect();
            console.log('Redis Connected');
        } catch(err){
            console.log('Error', err.message);            
        }
    }
)()

//without redis
app.get('/calculate-data', (req, res) => {
    var calData = 0;
    for (let i = 0; i < 10000000000; i++) {
        calData += 1
    }
    return res.send({ data: calData })
})

// with redis and using axios
app.get('/data', async (req, res) => {
    try {
        const userInput = (req.query.country).trim()
        const url = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${userInput}`

        //check in redis
        let cachedData = await redisClient.get(userInput)
        if (cachedData) {
            let Data = JSON.parse(cachedData)
            let NData = Data?.parse?.text
            return res.send(NData['*'])
            // return res.send({ Source:'Redis',Data: NData['*']})
            // return res.send({ Source:'Redis',Data})
        }

        //if data is not in redis, make api call and save in redis
        let resp = await axios.get(url)
        let Data = resp.data
        let setResult = await redisClient.set(userInput, JSON.stringify(Data))
        return res.send({ source: 'API', Data })

    } catch (err) {
        res.send({ Error: err.message })
    }
})

// with redis
app.get('/calculate-redisData', async (req, res) => {
    try {
        var calData = 0;
        // check if data is already in redis cache or not 
        const cachedData = await redisClient.get('calculatedData')
        if (cachedData) {
            return res.send({ data: cachedData, source: "Redis" })
        }
        for (let i = 0; i < 10000000000; i++) {
            calData += 1
        }
        await redisClient.set('calculatedData', calData)
        return res.send({ data: calData, source: "API" })
    } catch (err) {
        return res.send({ Error: err.message })
    }
})

// app.get('/data', async (req, res) => {
//     try {
//         const userInput = (req.query.country).trim()
//         const url = `https://en.wikipedia.org/w/api.php?action=parse&format=json&section=0&page=${userInput}`
//         //check in redis
//         // client.connect()

//         return await redisClient.get(userInput, async (err, result) => {
//         // return client.get(userInput, async (err, result) => {
//             if (!err) {
//                 const output = JSON.parse(result)
//                 res.send(output)
//             } else {
//                 //if data is not in redis, make api call and save in redis
//                 let resp = await axios.get(url)
//                 let Data = resp.data
//                 await redisClient.setex(userInput, 3600, JSON.stringify({ source: 'Redis Cache', Data }))
//                 // .then((resp)=>{
//                 //     const data=resp.data
//                 //     client.setEx(userInput, 3600, JSON.stringify({source:'Redis Cache', data}))
//                 //     res.send({source:'API',data})
//                 // })
//             }
//         })
//     } catch (err) {
//         res.send({ Error: err.message })
//     }
// })

app.listen(port, (err) => {
    console.log(`App is listening to port ${port}`);
})