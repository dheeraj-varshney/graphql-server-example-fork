const express = require('express')
const app = express()
const port = 3000

// let cnt = 0;

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/foo', (req, res) => {
    res.json({msg: 'Hello foo!'})
})
app.post('/health', (req, res) => {
    res.json({msg: 'Success!'})
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
