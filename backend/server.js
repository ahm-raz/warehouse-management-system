import express from "express";

const app = express();

app.get("/", (req, res) => {
    res.send("Warehouse Management System");
});

app.listen(3000, () => {
    console.log("Warehouse Management System is running on port 3000");
});