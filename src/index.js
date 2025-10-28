const express = require('express');
const cors = require("cors");
const { sequelize} = require('./models');

const { ServerConfig } = require('./config');
const countriesRouter = require('./routes/countries');


const app = express();
app.use(express.json());
app.use(cors());

app.use('/', countriesRouter);




sequelize.sync()
  .then(() => console.log('Database & tables created!'))
  .catch(err => console.error(err));

app.listen(ServerConfig.PORT, () => {
    console.log(`Successfully started the server on PORT : ${ServerConfig.PORT}`);
});
