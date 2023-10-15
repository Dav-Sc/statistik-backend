// Required modules for the server
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const { Client } = require("pg");
const unzipper = require('unzipper');
const pandas = require('pandas-js');
const jsonfile = require('jsonfile');


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

  // Call the function to insert the data
  insertData();
});





// Load the data from the JSON file
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_data.json'), 'utf8'));

// Define the client ID or name
const clientID = 1; // assuming client ID is 1

// Define the queries
const insertCreationQuery = `
  INSERT INTO live_creation (client_id, date, live_duration, live_videos)
  VALUES ($1, $2, $3, $4)
`;

const insertEarningQuery = `
  INSERT INTO live_earning (client_id, date, diamonds, gifters)
  VALUES ($1, $2, $3, $4)
`;

const insertInteractionQuery = `
  INSERT INTO live_interaction (client_id, date, new_followers, viewers_who_commented, likes, shares)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

const insertViewerQuery = `
  INSERT INTO live_viewer (client_id, date, total_views, unique_viewers, average_watch_time, top_viewer_count)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

// Define a function to insert the data
async function insertData() {
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Insert the data
    for (const item of data.LIVE_creation) {
      const date = new Date(item.Date).toISOString().split('T')[0];  // Format the date
      await client.query(
        
        `
          INSERT INTO 
          live_creation (client_id, date, live_duration, live_videos)
          VALUES ($1, $2, $3, $4)
        `


        , [clientID, date, item.LIVE_duration, item.LIVE_videos]);
    }

    for (const item of data.LIVE_earning) {
      const date = new Date(item.Date).toISOString().split('T')[0];  // Format the date
      await client.query(insertEarningQuery, [clientID, date, item.Diamonds, item.Gifters]);
    }

    for (const item of data.LIVE_interaction) {
      const date = new Date(item.Date).toISOString().split('T')[0];  // Format the date
      await client.query(insertInteractionQuery, [clientID, date, item[' New followers'], item['Viewers who commented'], item.Likes, item.Shares]);
    }

    for (const item of data.LIVE_viewer) {
      const date = new Date(item.Date).toISOString().split('T')[0];  // Format the date
      await client.query(insertViewerQuery, [clientID, date, item['Total views'], item['Unique viewers'], item['Average watch time'], item['Top viewer count']]);
    }

    // Commit the transaction
    await client.query('COMMIT');
  } catch (error) {
    // If an error occurs, rollback the transaction
    await client.query('ROLLBACK');
    console.error('Database insertion failed:', error);
  } finally {
    // End the client connection
    await client.end();
  }
}

// Define the folder where the zip files are located
const folderPath = 'server\\public\\files';

// Define a function to process a CSV file and add rows with non-zero values in the 2nd and 3rd columns to an array
async function processCsv(zipFilePath, csvFilename) {
  const dataArray = [];

  await fs.createReadStream(zipFilePath)
    .pipe(unzipper.Parse())
    .on('entry', (entry) => {
      if (entry.path === csvFilename) {
        entry.pipe(pandas.CsvReader({ skipEmptyLines: true }))
          .on('data', (row) => {
            if (row[1] !== 0 || row[2] !== 0) {
              dataArray.push({ column1: row[0], column2: row[1], column3: row[2] });
            }
          })
          .on('end', () => entry.autodrain());
      } else {
        entry.autodrain();
      }
    });

  return dataArray;
}

// Look for all files in the folder
fs.readdirSync(folderPath).forEach(async (filename) => {
  if (filename.endsWith('_creation.zip') || filename.endsWith('_earning.zip') || filename.endsWith('_interaction.zip') || filename.endsWith('_viewer.zip')) {
    // Construct the full path to the zip file
    const zipFilePath = `${folderPath}/${filename}`;

    try {
      let csvFilename;
      let key;

      if (filename.includes('_creation.zip')) {
        csvFilename = 'LIVE_creation.csv';
        key = 'LIVE_creation';
      } else if (filename.includes('_earning.zip')) {
        csvFilename = 'LIVE_earning.csv';
        key = 'LIVE_earning';
      } else if (filename.includes('_interaction.zip')) {
        csvFilename = 'LIVE_interaction.csv';
        key = 'LIVE_interaction';
      } else if (filename.includes('_viewer.zip')) {
        csvFilename = 'LIVE_viewer.csv';
        key = 'LIVE_viewer';
      }

      const data = await processCsv(zipFilePath, csvFilename);

      // Add the data array to the object
      dataObj[key] = data;
    } catch (e) {
      console.error(`Error processing ${csvFilename}: ${e}`);
    }
  }
});




// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
