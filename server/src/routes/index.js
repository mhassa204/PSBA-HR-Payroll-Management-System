const express = require('express');
const app = express();
const travelRateRoutes = require('./travelRateRoutes');

app.use('/', travelRateRoutes);

module.exports = app;