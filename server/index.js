// Required modules for the server
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const { Client } = require("pg");
const unzipper = require('unzipper');
const { parse } = require('csv-parse');

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

app.get('/data', async (req, res) => {
  const databaseName = req.query.name;
  const { rows } = await client.query(`SELECT * FROM ${databaseName}`);
  res.send(rows);
  console.log(`${rows}`)
  // res.send(`You sent the query parameter id with the value: ${databaseName}`);

});

app.get('/totalviewdate', async (req, res) => {
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

app.post('/addclient', async (req, res) => {
  const name = req.query.name;
  console.log('name:', name);
  const { rows } = await client.query(`

    INSERT INTO clientMaster (clientName)
    VALUES ('${name}');
  
  `);
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
        cm.clientID, cm.clientName
    )
    SELECT
      cm.clientID,
      cm.clientName,
      COALESCE(cv.totalViews, 0) AS totalViews,
      COALESCE(MIN(tm.date), '1999-01-01'::date) AS earliestDate  
    FROM
      clientMaster cm
    LEFT JOIN
      ClientViews cv ON cm.clientID = cv.clientID
    LEFT JOIN
      tikTokMaster tm ON cm.clientID = tm.clientID
    GROUP BY
      cm.clientID, cm.clientName, cv.totalViews;
    
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
  extractFiles();
});


const directoryPath = 'server\\public\\files';  // Adjust the path accordingly

// Function to unzip files
async function unzipFile(filePath, extractPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', resolve)
      .on('error', reject);
  });
}
// Function to delete files
function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Failed to delete ${filePath}: ${err.message}`);
    } else {
      console.log(`Successfully deleted ${filePath}`);
    }
  });
}

// Read the directory
function extractFiles() {
  fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      console.error('Could not list the directory.', err);
      process.exit(1);
    }

    // Filter files based on specified criteria
    const zipFiles = files.filter(file =>
      file.endsWith('_creation.zip') ||
      file.endsWith('_earning.zip') ||
      file.endsWith('_interaction.zip') ||
      file.endsWith('_viewer.zip')
    );

    // Unzip each file
    for (const zipFile of zipFiles) {
      const filePath = `${directoryPath}\\${zipFile}`;
      const extractPath = `${directoryPath}`;  // Adjust the extraction path accordingly

      try {
        await unzipFile(filePath, extractPath);
        console.log(`Successfully unzipped ${zipFile}`);
        deleteFile(filePath);
      } catch (error) {
        console.error(`Failed to unzip ${zipFile}: ${error.message}`);
      }
    }
  });
}

// readCSV('server\\public\\files\\LIVE_creation.csv')

function readCSV(csvFilePath) {
  const csvData = [];
  fs.createReadStream(csvFilePath)
    .pipe(
      parse({
        quote: '"',
        ltrim: true,
        rtrim: true,
        delimiter: ',',
        bom: true,
      }))
    .on('data', (row) => {
      const rowValues = Object.values(row);
      // Check the values of the second and third columns by index
      if (rowValues[1] !== '0' || rowValues[2] !== '0') {
        csvData.push(row);
      }
      console.log(csvData);

      const jsonDataArray = convertArrayToJson(csvData);
      console.log(jsonDataArray);
    })
    .on('end', () => {
      // Log the parsed data to the console
      //console.log(csvData);
    });
}

function convertArrayToJson(inputArray) {
  // Initialize an empty array to store the JSON objects
  const jsonDataArray = [];

  // Extract the headers (first row) from the input array
  const headers = inputArray[0];

  // Iterate through the input array starting from the second row (index 1)
  for (let i = 1; i < inputArray.length; i++) {
    const dataRow = inputArray[i];
    const jsonDataObject = {};

    // Iterate through each column in the current row
    for (let j = 0; j < dataRow.length; j++) {
      const header = headers[j].replace(/ /g, ''); // Remove spaces from the header
      const value = dataRow[j];

      // Use the modified header as the key and the corresponding value from the row
      jsonDataObject[header] = value;
    }

    // Add the JSON object to the jsonDataArray
    jsonDataArray.push(jsonDataObject);
  }

  return jsonDataArray;
}



// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
