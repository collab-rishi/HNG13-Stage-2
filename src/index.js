const express = require("express");
const dotenv = require("dotenv");
const countryRoutes = require('./routes/countryRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');
const db = require('./models'); 
const statusController = require('./controllers/statusController');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//middlewares
app.use(express.json());



app.use("/countries", countryRoutes);

app.get('/status', statusController.getStatus);

app.use(errorHandler);




db.sequelize.sync({ alter: true }) 
  .then(() => {
    console.log("Database synced successfully");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("Error syncing database:", err);
  });