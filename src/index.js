const express = require("express");
const dotenv = require("dotenv");
const countryRoutes = require('./routes/countryRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const db = require('./models'); ;
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//middlewares
app.use(express.json());



app.use("/", countryRoutes);

app.use(errorHandler);




db.sequelize.sync({ alter: true }) // creates/updates tables if needed
  .then(() => {
    console.log("Database synced successfully");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("Error syncing database:", err);
  });