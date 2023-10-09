const express = require("express");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3005;

const app = express();

app.get("/api", (req, res) => {
  // Read the JSON file and return its content
  fs.readFile(path.join(__dirname, "testdata.json"), "utf8", (err, data) => {
    if (err) {
      console.error("Failed to read data.json", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
