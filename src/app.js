const express = require('express');
const cors = require('cors');
const { registerTicketRoutes } = require('./controllers/ticketController');

const app = express();
const port = 3500;

app.use(express.json());

app.use(cors({
    origin: "*",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["POST"],
    credentials: true,
}));

registerTicketRoutes(app);

app.listen(port, () => {
    return console.log(`Express is listening at http://localhost:${port}`);
});
