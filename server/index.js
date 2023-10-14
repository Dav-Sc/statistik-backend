// Required modules for the server
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const { Client } = require("pg");


// Set the port for the server. Use the environment variable or a default value
const PORT = process.env.PORT || 3005;

// Initialize the express application
const app = express();

// Use the CORS middleware to allow cross-origin requests
app.use(cors());

const client = new Client({
  host: "localhost",
  user: "postgres",
  port: 5432,
  password: "root",
  database: "Statistik",
});

client.connect();

app.get('/data', async(req, res) => {
  const databaseName = req.query.name;
  const { rows } = await client.query(`SELECT * FROM ${databaseName}`);
  res.send(rows);
  console.log(`${rows}`)
  // res.send(`You sent the query parameter id with the value: ${databaseName}`);

});

app.get('/totalviewdate', async(req, res) => {
  const clientid = req.query.id;
  const date = req.query.date;
  console.log('clientid:', clientid);
  console.log('date:', date); 
  const { rows } = await client.query(`

    SELECT trd.totalViews, tm.date
    FROM tikTokRawData trd
    INNER JOIN tikTokMaster tm ON trd.date = tm.date
    WHERE tm.clientID = ${clientid}
      AND tm.date = '${date}';
  
  `);
  res.send(rows);
  console.log(`${rows}`)
  // res.send(`You sent the query parameter id with the value: ${databaseName}`);

});

app.post('/addclient', async(req, res) => {
  const name = req.query.name;
  console.log('name:', name); 
  const { rows } = await client.query(`

    INSERT INTO clientMaster (clientName)
    VALUES ('${name}');
  
  `);
  // res.send(rows);
  console.log(`${rows}`)
  // res.send(`You sent the query parameter id with the value: ${databaseName}`);

});

app.get('/getclients', async (req, res) => {
  try {
    const queryText = `
    WITH ClientViews AS (
      SELECT
        cm.clientID,
        cm.clientName,
        SUM(trd.totalViews) AS totalViews
      FROM
        clientMaster cm
      JOIN
        tikTokMaster tm ON cm.clientID = tm.clientID
      JOIN
        tikTokRawData trd ON tm.date = trd.date
      GROUP BY
        cm.clientID
    )
    SELECT
      cv.clientID,  -- Include clientID here
      cv.clientName,
      cv.totalViews,
      MIN(tm.date) AS earliestDate
    FROM
      ClientViews cv
    JOIN
      tikTokMaster tm ON cv.clientID = tm.clientID
    GROUP BY
      cv.clientID,  -- Include clientID here
      cv.clientName,
      cv.totalViews;
  `;
    const { rows } = await client.query(queryText);
    console.log(rows)
    res.json(rows);
    
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});




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

//File uploading!!!
// Define the storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'public', 'files')); // Specify the destination folder
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage });

// Handle file uploads for multiple files
app.post('/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const fileNames = req.files.map((file) => file.filename);

  res.json({
    files: fileNames.map((fileName) => `public/files/${fileName}`),
  });

  console.log(`Recieved File`);
});


// // Execute the pandas data extraciton and upload the data to posgres or handle its outputs and errors
// const pythonProcess = spawn('python', ['./server/test.py']);

// // Print Python data
// pythonProcess.stdout.on('data', (data) => {
//   console.log(`Python Output: ${data}`);
// });

// // Print Python errors
// pythonProcess.stderr.on('data', (data) => {
//   console.error(`Python Error: ${data}`);
// });

// // Log when the Python script has finished executing
// pythonProcess.on('close', (code) => {

//   console.log(`Python script exited with code ${code}`);
// });

// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
