// Required modules for the server
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');

// Set the port for the server. Use the environment variable or a default value
const PORT = process.env.PORT || 3005;

// Initialize the express application
const app = express();

// Use the CORS middleware to allow cross-origin requests
app.use(cors());

// Endpoint to get the graph data
app.get("/graph", (req, res) => {
  // Read the specified JSON file and return its content
  fs.readFile(path.join(__dirname, "./clienta/graph.json"), "utf8", (err, data) => {
    if (err) {
      console.error("Failed to read graph.json", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    // Set the response header to send JSON data
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  });
});

// Endpoint to get the stream data
app.get("/stream", (req, res) => {
  // Read the specified JSON file and return its content
  fs.readFile(path.join(__dirname, "./clienta/stream.json"), "utf8", (err, data) => {
    if (err) {
      console.error("Failed to read stream.json", err);
      res.status(500).send("Internal Server Error");
      return;
    }
    // Set the response header to send JSON data
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  });
});

// Configuration for file upload using multer
const storage = multer.diskStorage({
  // Define where the uploaded files will be saved
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  // Define the naming strategy for uploaded files can change it to be based off a pregession or something else
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
});

// Create a multer instance with the defined storage
const upload = multer({ storage: storage });

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully' });
});

// Execute the pandas data extraciton and upload the data to posgres or handle its outputs and errors
const pythonProcess = spawn('python', ['something?.py']);


// Print Python data
pythonProcess.stdout.on('data', (data) => {
  console.log(`Python Output: ${data}`);
});

// Print Python errors
pythonProcess.stderr.on('data', (data) => {
  console.error(`Python Error: ${data}`);
});

// Log when the Python script has finished executing
pythonProcess.on('close', (code) => {
 
  console.log(`Python script exited with code ${code}`);
});

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
