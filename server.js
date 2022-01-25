const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})
app.get('/foo', (req, res) => {
    res.json({msg: 'Hello foo!'})
})
app.get('/foo', (req, res) => {
    res.json({msg: 'Hello foo!'})
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
