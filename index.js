const express = require('express');
const app = express();
const path = require('path');

app.get('/warmup', (request, response) => {
    response.send('Warming up friend.');
})

app.listen(process.env.PORT || 4000, function(){
    console.log('Your node js server is running');
});