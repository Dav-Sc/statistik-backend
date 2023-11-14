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
const bonjour = require('bonjour')();

// advertise an HTTP server on port 3000
bonjour.publish({ name: 'Statistik Backend', type: 'http', port: 3005 });

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

/**
 * GET Endpoint to fetch data from a specified database table. This is a good example of a template for future api calls
 * 
 * @path /data
 * @method GET
 * 
 * @queryparam {string} name - The name of the database table from which data is to be retrieved.
 * 
 * @returns {Array} rows - The data rows from the specified table.
 * 
 * @example
 * To fetch data from a table named 'users', send a GET request to:
 * /data?name=users
 */
app.get('/data', async (req, res) => {
  // Extract the table name from the query parameters.
  const databaseName = req.query.name;
  // Fetch data from the specified table.
  const { rows } = await client.query(`SELECT * FROM ${databaseName}`);
  // Send the data rows as the response.
  res.send(rows);

  console.log(`${rows}`);
});



/**
 * GET Endpoint to fetch the total views for a specific client on a specific date.
 * 
 * @path /totalviewdate
 * @method GET
 * 
 * @queryparam {string} id - The client ID for which data is to be retrieved.
 * @queryparam {string} date - The specific date for which total views are to be fetched in 'YYYY-MM-DD' format.
 * 
 * @returns {Array} rows - The data rows containing total views and date for the specified client ID and date.
 * 
 * @example
 * To fetch the total views for client ID '123' on date '2023-01-01', send a GET request to:
 * /totalviewdate?id=1&date=2023-01-01
 */
app.get('/totalviewdate', async (req, res) => {
  // Extract the client ID and date from the query parameters.
  const clientid = req.query.id;
  const date = req.query.date;

  // Log the received parameters for debugging purposes.
  // console.log('clientid:', clientid);
  // console.log('date:', date);

  try {
    // Use parameterized queries to prevent SQL injection.
    const queryText = `
      SELECT trd.totalViews, tm.date
      FROM tikTokRawData trd
      INNER JOIN tikTokMaster tm ON trd.date = tm.date
      WHERE tm.clientID = $1 AND tm.date = $2;
    `;

    const values = [clientid, date];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});
//
//const inputDate = date;
//const dateObject = new Date(inputDate);
//const formattedDate = dateObject.toISOString().split('T')[0];
// 

app.get('/streamspec', async (req, res) => {
  // Extract the client ID and date from the query parameters.
  //const clientid = req.query.id;
  const date = req.query.date;

  // Log the received parameters for debugging purposes.
  //console.log('clientid:', clientid);
  // console.log('date:', date);

  try {
    // Use parameterized queries to prevent SQL injection.
    const queryText = `
    SELECT
        trd.totalViews,
        trd.uniqueViewers,
        trd.avgWatchTime,
        trd.topViewerCount,
        trd.newFollowers,
        trd.viewersWhoCommented,
        trd.likes,
        trd.shares,
        trd.diamonds,
        trd.gifters,
        trd.liveDuration,
        tme.startTime,
        tme.avgViewerCount,
        tme.followersWatchedLive,
        tme.followersSentGifts,
        tme.followersCommented,
        tme.followersAvgWatchTime,
        tme.othersAvgWatchTime,
        tme.viewsFromSuggestedLiveVideos,
        tme.viewsFromForYouShortVideos,
        tme.viewsFromOthers,
        tme.viewsFromShares,
        tme.viewsFromFollowing,
        tcm.avgMinutesWatched,
        tcm.totalViewsPerMin,
        tcm.uniqueViewersPerMin,
        tcm.diamondsPerMin,
        tcm.giftersPerMin,
        tcm.diamondsPerGifter,
        tcm.viewersPerGifter,
        tcm.newFollowersPerMin,
        tcm.viewersWhoCommentedPerMin,
        tcm.likesPerMin,
        tcm.sharesPerMin,
        tcm.viewerHours,
        tcm.viewerHoursPerMin,
        tcm.conversionRate,
        tcm.followerHourPortion
    FROM
        tikTokMaster tm
    JOIN
        clientMaster cm ON tm.clientID = cm.clientID
    LEFT JOIN
        tikTokRawData trd ON tm.date = trd.date
    LEFT JOIN
        tikTokManualEntry tme ON tm.date = tme.date
    LEFT JOIN
        tikTokCalculatedMetrics tcm ON tm.date = tcm.date
    WHERE
        tm.date = $1; -- Insert the desired date

    `;

    const values = [date];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    //console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

//http://localhost:3005/updatestreamvalue?date=${date}&key=${key}&value=${newValue}
app.get('/updatestreamvalue', async (req, res) => {
  const date = req.query.date;
  const key = req.query.key;
  const newValue = req.query.value;

  // console.log(date, key, newValue)

  try {
    // Validate that the key provided is a valid column name in your tables.
    const validKeys = [
      'totalviews', 'uniqueviewers', 'avgwatchtime', 'topviewercount',
      'newfollowers', 'viewerswhocommented', 'likes', 'shares', 'diamonds',
      'gifters', 'liveduration', 'starttime', 'avgviewercount',
      'followerswatchedlive', 'followerssentgifts', 'followerscommented',
      'followersavgwatchtime', 'othersavgwatchtime', 'viewsfromsuggestedlivevideos',
      'viewsfromforyoushortvideos', 'viewsfromothers', 'viewsfromshares',
      'viewsfromfollowing', 'avgminuteswatched', 'totalviewspermin',
      'uniqueviewerspermin', 'diamondspermin', 'gifterspermin',
      'diamondspergifter', 'viewerspergifter', 'newfollowerspermin',
      'viewerswhocommentedpermin', 'likespermin', 'sharespermin',
      'viewerhours', 'viewerhourspermin', 'conversionrate', 'followerhourportion'
    ];

    if (!validKeys.includes(key)) {
      return res.status(400).send('Invalid key provided');
    }

    // Create an object to map the key to the corresponding table and column.
    const tableColumnMap = {
      totalviews: 'tikTokRawData.totalviews',
      uniqueviewers: 'tikTokRawData.uniqueviewers',
      avgwatchtime: 'tikTokRawData.avgWatchTime',
      topviewercount: 'tikTokRawData.topviewercount',
      newfollowers: 'tikTokRawData.newfollowers',
      viewerswhocommented: 'tikTokRawData.viewerswhocommented',
      likes: 'tikTokRawData.likes',
      shares: 'tikTokRawData.shares',
      diamonds: 'tikTokRawData.diamonds',
      gifters: 'tikTokRawData.gifters',
      liveduration: 'tikTokRawData.liveduration',
      starttime: 'tikTokManualEntry.startTime',
      avgviewercount: 'tikTokManualEntry.avgviewercount',
      followerswatchedlive: 'tikTokManualEntry.followerswatchedlive',
      followerssentgifts: 'tikTokManualEntry.followerssentgifts',
      followerscommented: 'tikTokManualEntry.followerscommented',
      followersavgwatchtime: 'tikTokManualEntry.followersavgwatchtime',
      othersavgwatchtime: 'tikTokManualEntry.othersavgwatchtime',
      viewsfromsuggestedlivevideos: 'tikTokManualEntry.viewsfromsuggestedlivevideos',
      viewsfromforyoushortvideos: 'tikTokManualEntry.viewsfromforyoushortvideos',
      viewsfromothers: 'tikTokManualEntry.viewsfromothers',
      viewsfromshares: 'tikTokManualEntry.viewsfromshares',
      viewsfromfollowing: 'tikTokManualEntry.viewsfromfollowing',
      avgminuteswatched: 'tikTokCalculatedMetrics.avgminuteswatched',
      totalviewspermin: 'tikTokCalculatedMetrics.totalviewspermin',
      uniqueviewerspermin: 'tikTokCalculatedMetrics.uniqueviewerspermin',
      diamondspermin: 'tikTokCalculatedMetrics.diamondspermin',
      gifterspermin: 'tikTokCalculatedMetrics.gifterspermin',
      diamondspergifter: 'tikTokCalculatedMetrics.diamondspergifter',
      viewerspergifter: 'tikTokCalculatedMetrics.viewerspergifter',
      newfollowerspermin: 'tikTokCalculatedMetrics.newfollowerspermin',
      viewerswhocommentedpermin: 'tikTokCalculatedMetrics.viewerswhocommentedpermin',
      likespermin: 'tikTokCalculatedMetrics.likespermin',
      sharespermin: 'tikTokCalculatedMetrics.sharespermin',
      viewerhours: 'tikTokCalculatedMetrics.viewerhours',
      viewerhourspermin: 'tikTokCalculatedMetrics.viewerhourspermin',
      conversionrate: 'tikTokCalculatedMetrics.conversionrate',
      followerhourportion: 'tikTokCalculatedMetrics.followerhourportion'
    };


    // Use the map to determine the table and column for the provided key.
    const tableAndColumn = tableColumnMap[key];

    if (!tableAndColumn) {
      return res.status(400).send('Key mapping not found');
    }

    // console.log(tableAndColumn.split('.')[0]);
    // console.log(tableAndColumn.split('.')[1]);

    // Use parameterized queries to update the specified column.
    const queryText = `
      UPDATE ${tableAndColumn.split('.')[0]}
      SET ${tableAndColumn.split('.')[1]} = $1
      WHERE date = $2
    `;

    const values = [newValue, date];

    // console.log(queryText, values);

    await client.query(queryText, values);


    res.status(200).send('Update successful');
  } catch (error) {
    console.error('Update failed:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/deleteStream', async (req, res) => {
  // Extract the client ID and date from the query parameters.
  const date = req.query.date;

  // Log the received parameters for debugging purposes.
  // console.log('date:', date);

  try {

    await client.query('DELETE FROM tikTokCalculatedMetrics WHERE date = $1;;', [date]);
    await client.query('DELETE FROM tikTokManualEntry WHERE date = $1;;', [date]);
    await client.query('DELETE FROM tikTokRawData WHERE date = $1;;', [date]);
    await client.query('DELETE FROM tikTokMaster WHERE date = $1;;', [date]);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/views', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;

  // Log the received parameters for debugging purposes.
  //console.log('clientid:', clientid);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.
    const queryText = `
    SELECT 
      trd.date,
      ROUND(trd.totalViews / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS viewsPerMinute,
      ROUND(trd.uniqueViewers / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS uniqueViewersPerMinute
    FROM tikTokRawData trd
    INNER JOIN tikTokMaster tm ON trd.date = tm.date
    WHERE tm.clientID = $1
    ORDER BY trd.date;
    `;
    const values = [clientid];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/createemptystream', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;
  const emptyDate = req.query.date;

  // Log the received parameters for debugging purposes.
  //console.log('clientid:', clientid);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.


    await client.query('INSERT INTO tikTokMaster (clientID, date) VALUES ($1, $2);', [clientid, emptyDate]);
    await client.query('INSERT INTO tikTokRawData  (date) VALUES ($1);', [emptyDate]);
    await client.query('INSERT INTO tikTokManualEntry  (date) VALUES ($1);', [emptyDate]);
    await client.query('INSERT INTO v  (date) VALUES ($1);', [emptyDate]);



    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/rewards', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;

  // console.log('clientid:', clientid);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.
    const queryText = `
    SELECT 
      trd.date,
      ROUND(trd.diamonds / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS diamondspermin,
      ROUND(trd.gifters / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS gifterspermin,
      ROUND(trd.diamonds / gifters, 2) AS diamondspergifters
    FROM tikTokRawData trd
    INNER JOIN tikTokMaster tm ON trd.date = tm.date
    WHERE tm.clientID = $1
    ORDER BY trd.date;
    `;
    const values = [clientid];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/engagement', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;

  // Log the received parameters for debugging purposes.
  // console.log('clientid:', clientid);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.
    const queryText = `
    SELECT 
        trd.date,
        ROUND(trd.newFollowers / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS newFollowersPerMinute,
        ROUND(trd.likes / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS likesPerMinute,
        ROUND(trd.viewersWhoCommented / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS viewersWhoCommentedPerMinute,
        ROUND(trd.shares / (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0), 2) AS sharesPerMinute
    FROM tikTokRawData trd
    INNER JOIN tikTokMaster tm ON trd.date = tm.date
    WHERE tm.clientID = $1
    ORDER BY trd.date;

    `;
    const values = [clientid];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/sponsorships', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;

  // Log the received parameters for debugging purposes.
  // console.log('clientid:', clientid);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.
    const queryText = `
    SELECT 
        trd.date,
        ROUND((trd.uniqueViewers * (CASE WHEN trd.liveDuration = 0 THEN 1 ELSE trd.liveDuration END / 60.0)) / 60.0, 2) AS uniqueViewersPerHour,
        ROUND((trd.liveDuration / 60.0), 2) AS viewerHoursPerMinute
    FROM tikTokRawData trd
    INNER JOIN tikTokMaster tm ON trd.date = tm.date
    WHERE tm.clientID = $1
    ORDER BY trd.date;


    `;
    const values = [clientid];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/streams', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;

  // Log the received parameters for debugging purposes.
  // console.log('clientid:', clientid);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.
    const queryText = `
    SELECT 
	    trd.*
    FROM tikTokRawData trd
    INNER JOIN tikTokMaster tm ON trd.date = tm.date
    WHERE tm.clientID = $1
    ORDER BY trd.date;
    `;
    const values = [clientid];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});



app.get('/delclient', async (req, res) => {
  // Extract the client ID from the query parameters.
  const clientid = req.query.id;

  // Log the received parameters for debugging purposes.
  // console.log('clientid:', clientid);

  try {
    // Execute each DELETE statement separately.
    await client.query('DELETE FROM tikTokCalculatedMetrics WHERE date IN (SELECT date FROM tikTokMaster WHERE clientID = $1);', [clientid]);
    await client.query('DELETE FROM tikTokManualEntry WHERE date IN (SELECT date FROM tikTokMaster WHERE clientID = $1);', [clientid]);
    await client.query('DELETE FROM tikTokRawData WHERE date IN (SELECT date FROM tikTokMaster WHERE clientID = $1);', [clientid]);
    await client.query('DELETE FROM tikTokMaster WHERE clientID = $1;', [clientid]);
    await client.query('DELETE FROM clientMaster WHERE clientID = $1;', [clientid]);

    // Send a success response.
    res.send({ message: 'Client data deleted successfully' });
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});





app.get('/renameclient', async (req, res) => {
  const clientid = req.query.id;
  const clientname = req.query.name;

  // Log the received parameters for debugging purposes.
  // console.log('clientid:', clientid);
  // console.log('clientname:', clientname);

  try {
    // Fetch totalViews divided by (liveDuration/60) for the specified client ID.
    const queryText = `
      UPDATE clientMaster
      SET clientName = $2
      WHERE clientID = $1;
    `;
    const values = [clientid, clientname];

    const { rows } = await client.query(queryText, values);

    // Send the fetched data as the response.
    res.send(rows);
    // console.log(rows);
  } catch (error) {
    // Handle the error and send a response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});



/**
 * POST Endpoint to add a new client to the clientMaster table.
 * 
 * @path /addclient
 * @method POST
 * 
 * @queryparam {string} name - The name of the new client to be added.
 * 
 * @returns {void} No explicit return value, but the response might include implicit database execution results.
 * 
 * @example
 * To add a new client with the name 'John Doe', send a POST request to:
 * /addclient?name=John%20Doe
 */
app.get('/addclient', async (req, res) => {
  // Extract the client's name from the query parameters.
  const name = req.query.name;

  // Log the received name for debugging purposes.
  // console.log('name:', name);

  // Insert the new client's name into the clientMaster table.
  const { rows } = await client.query(`

    INSERT INTO clientMaster (clientName)
    VALUES ('${name}');
  
  `);
});


/**
 * GET Endpoint to fetch a list of clients along with their aggregate total views 
 * and the earliest date they received views.
 * 
 * The query aggregates data across multiple tables:
 * - `clientMaster`: Contains details of the client.
 * - `tikTokMaster`: Contains mapping of clients to dates.
 * - `tikTokRawData`: Contains raw data with views for dates.
 * 
 * @path /getclients
 * @method GET
 * 
 * @returns {Array} - An array of client objects with their clientID, clientName, totalViews, and earliestDate of views.
 * 
 * @example
 * Send a GET request to:
 * /getclients
 * 
 * Expected response format (example):
 * [
 *   { clientID: 1, clientName: 'John', totalViews: 500, earliestDate: '2023-01-01' },
 *   ...
 * ]
 */
app.get('/getclients', async (req, res) => {
  try {
    // SQL query to retrieve the client details.
    // The query first aggregates the total views per client and then joins with the master client list
    // to retrieve the aggregate details for each client.
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

    // Execute the SQL query.
    const { rows } = await client.query(queryText);

    // Log the result for debugging purposes.
    // console.log(rows);

    // Send the result as a JSON response.
    res.json(rows);

  } catch (error) {
    // Log the error and send a generic internal server error response.
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * File Upload Handling Module
 * This module provides functionalities for receiving and storing uploaded files.
 * 
 * Uses `multer`, a middleware for handling `multipart/form-data`, which is used 
 * for file uploads.
 */

// Define how the uploaded files should be stored.
const storage = multer.diskStorage({
  // Define the destination of the uploaded files.
  destination: (req, file, cb) => {
    // Files will be saved in the 'public/files' directory.
    cb(null, path.join(__dirname, 'public', 'files'));
  },

  // Define the naming strategy for uploaded files.
  filename: (req, file, cb) => {
    // Files will be saved with their original names.
    cb(null, file.originalname);
  },
});

// Initialize the multer middleware with the defined storage strategy.
const upload = multer({ storage });

/**
 * POST Endpoint to handle file uploads.
 * 
 * @path /upload
 * @method POST
 * 
 * @param {Array} files - An array of files to be uploaded. The field name should be 'files'.
 * 
 * @returns {JSON} - A JSON response containing paths to the uploaded files.
 * 
 * @example
 * To upload files, send a POST request with files as form-data to:
 * /upload
 * 
 * Expected response format:
 * {
 *   files: ['public/files/file1.jpg', 'public/files/file2.pdf', ...]
 * }
 * 
 * @error
 * If no files are uploaded, a 400 status code with an error message is returned.
 */
app.post('/upload', upload.array('files'), async (req, res) => {
  const clientid = req.query.id;
  // Check if files were provided in the request.
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  // Extract file names from the uploaded files.
  const fileNames = req.files.map((file) => file.filename);

  // Send a response with paths to the uploaded files.
  res.json({
    files: fileNames.map((fileName) => `public/files/${fileName}`),
  });

  // Log a message indicating a successful file upload.
  //console.log(`Received File`);

  // Execute the 'extractFiles' function, which presumably handles further processing of the files.
  try {
    await extractFiles();
    // console.log(`\n\n\nReceived clientid`, toString(clientid));
    updateAllData(clientid);

  } catch (error) {
    console.error("Error in processing files:", error);
    // Handle error as needed, maybe send a response or log it.
  }

});


const directoryPath = path.join('server', 'public', 'files');  // Adjust the path accordingly

/**
 * Unzips a specified file.
 * 
 * This function reads the file at the provided path and extracts its contents to the 
 * specified extraction path. It uses Node.js streams for efficient handling of the 
 * file without fully loading it into memory.
 * 
 * @param {string} filePath - The path to the file to be unzipped.
 * @param {string} extractPath - The directory where the contents should be extracted.
 * 
 * @returns {Promise} - Resolves once the file extraction is complete. 
 *                      Rejects if there is an error during extraction.
 * 
 * @example
 * 
 * unzipFile('path/to/file.zip', 'path/to/extract')
 *   .then(() => console.log('File unzipped successfully'))
 *   .catch(error => console.error(`Failed to unzip: ${error.message}`));
 */
async function unzipFile(filePath, extractPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(unzipper.Extract({ path: extractPath }))
      .on('close', resolve)
      .on('error', reject);
  });
}

/**
 * Deletes a file at the specified path.
 * 
 * This function attempts to delete a file and logs the outcome, whether successful or 
 * failed. It's a simple tool for file cleanup operations.
 * 
 * @param {string} filePath - The path to the file to be deleted.
 * 
 * @example
 * 
 * deleteFile('path/to/file.zip');
 */
function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Failed to delete ${filePath}: ${err.message}`);
    } else {
      console.log(`Successfully deleted ${filePath}`);
    }
  });
}

/**
 * Extracts zip files from a specified directory.
 * 
 * This function reads the files in a given directory and extracts the contents of 
 * zip files that match specific naming patterns. Once a file is unzipped successfully, 
 * the original zip file is deleted. 
 * 
 * The function specifically looks for zip files that end with:
 * - `_creation.zip`
 * - `_earning.zip`
 * - `_interaction.zip`
 * - `_viewer.zip`
 * 
 * @example
 * 
 * // Assuming `directoryPath` is set to 'path/to/files'
 * extractFiles();  
 * 
 */
function extractFiles() {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, async (err, files) => {
      if (err) {
        console.error('Could not list the directory.', err);
        reject(err);  // Reject the Promise if there's an error reading the directory.
        return;
      }

      const zipFiles = files.filter(file =>
        file.endsWith('_creation.zip') ||
        file.endsWith('_earning.zip') ||
        file.endsWith('_interaction.zip') ||
        file.endsWith('_viewer.zip')
      );

      try {
        for (const zipFile of zipFiles) {
          const filePath = path.join(directoryPath, zipFile);
          const extractPath = directoryPath;
      
          await unzipFile(filePath, extractPath);
          console.log(`Successfully unzipped ${zipFile}`);
          await deleteFile(filePath);
        }
        resolve();
      } catch (error) {
        console.error(`Failed to process zip files: ${error.message}`);
        reject(error);
      }
    });
  });
}



// readCSV('server\\public\\files\\LIVE_creation.csv')

/**
 * Reads and processes a CSV file.
 * 
 * This function reads the content of a given CSV file and processes each row. It 
 * filters out rows based on specific criteria set for the second and third columns 
 * of the CSV (i.e., if they are not equal to '0'). Processed rows are then converted 
 * to a JSON format and logged to the console.
 * 
 * The function utilizes the `parse` function from an unspecified CSV parsing library 
 * (likely from the `csv-parser` or a similar library).
 * 
 * @param {string} csvFilePath - The path to the CSV file to be read.
 * 
 * @example
 * 
 * // To process a CSV file located at 'path/to/data.csv':
 * readCSV('path/to/data.csv');
 * 
 * @note The function relies on the existence of a `convertArrayToJson` function, which 
 *  is defined below
 */
function readCSV(csvFilePath) {
  return new Promise((resolve, reject) => {
    const csvData = [];

    fs.createReadStream(csvFilePath)
      .pipe(
        parse({
          quote: '"',
          ltrim: true,
          rtrim: true,
          delimiter: ',',
          bom: true,
        })
      )
      .on('data', (row) => {
        const rowValues = Object.values(row);
        if (rowValues[1] !== '0' || rowValues[2] !== '0') {
          csvData.push(row);
        }
      })
      .on('end', () => {
        const jsonDataArray = convertArrayToJson(csvData);
        resolve(jsonDataArray);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}



/**
 * Converts a 2D array into an array of JSON objects.
 * 
 * This function transforms a given 2D array into an array of JSON objects. The first row 
 * of the input 2D array is treated as the headers, which are used as the property names 
 * for the resulting JSON objects. The subsequent rows are treated as data, where each row 
 * corresponds to one JSON object.
 * 
 * Spaces within the headers are removed to ensure the JSON object property names are valid.
 * 
 * @param {Array[]} inputArray - The 2D array to be converted. The first row should contain the headers.
 * 
 * @returns {Object[]} Returns an array of JSON objects, each representing a row from the input array.
 * 
 * @example
 * 
 * // Convert the following 2D array:
 * const data = [
 *   ['Name', 'Age', 'Occupation'],
 *   ['Alice', '28', 'Engineer'],
 *   ['Bob', '32', 'Doctor']
 * ];
 * 
 * const jsonOutput = convertArrayToJson(data);
 * console.log(jsonOutput);
 * // Output: 
 * // [
 * //   { "Name": "Alice", "Age": "28", "Occupation": "Engineer" },
 * //   { "Name": "Bob", "Age": "32", "Occupation": "Doctor" }
 * // ]
 * 
 */
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
      const header = headers[j].replace(/ /g, ''); // Remove spaces from the header to create valid JSON property names
      const value = dataRow[j];

      // Map the header (as key) to its corresponding value from the row
      jsonDataObject[header] = value;
    }

    // Add the constructed JSON object to the jsonDataArray
    jsonDataArray.push(jsonDataObject);
  }


  return jsonDataArray;
}




/*
tikTokMaster
create streamid
assign it in clientid
assign a date
*/
async function insertStreamMaster(jsonDataObject, clientId) {
  try {
    for (const item of jsonDataObject) {
      const dateInDBFormat = convertDate(item.Date);

      const queryText = `
        INSERT INTO tikTokMaster (clientid, date)
        VALUES ($1, $2)
        ON CONFLICT (date) DO NOTHING;
      `;
      const values = [clientId, dateInDBFormat];
      const { rows } = await client.query(queryText, values);
      //console.log(rows);
    }

    // Send the result as a JSON response (though this will send multiple responses, one per item).
    // This is just for illustration. In practice, you might want to send a single response once all insertions are complete.
    //res.json({ status: "All data inserted successfully!" });

  } catch (error) {
    console.error('Database query failed:', error);
    //res.status(500).send('Internal Server Error');
  }
}

// Convert the date from 'MMM DD, YYYY' format to 'YYYY-MM-DD'
function convertDate(dateString) {
  const dateObj = new Date(dateString);
  //console.log(dateObj.toISOString().split('T')[0]);
  return dateObj.toISOString().split('T')[0];
}

async function updateAllData(clientId) {
  await updateMasterCreationData(clientId);
  updateEarningData();
  updateInteractionData();
  updateViewerData();
}

async function updateMasterCreationData(clientId) {
  try {
    const csvFilePath = path.join('server', 'public', 'files', 'LIVE_creation.csv');
    const data = await readCSV(csvFilePath);
    await insertStreamMaster(data, clientId);
    await insertCreation(data);
  } catch (err) {
    console.error('Error processing CSV:', err);
  }
}

async function updateEarningData() {
  try {
    const csvFilePath = path.join('server', 'public', 'files', 'LIVE_earning.csv');
    const data = await readCSV(csvFilePath);
    await insertEarning(data);
  } catch (err) {
    console.error('Error processing CSV:', err);
  }
}

async function updateInteractionData() {
  try {
    const csvFilePath = path.join('server', 'public', 'files', 'LIVE_interaction.csv');
    const data = await readCSV(csvFilePath);
    await insertInteractions(data);
  } catch (err) {
    console.error('Error processing CSV:', err);
  }
}

async function updateViewerData() {
  try {
    const csvFilePath = path.join('server', 'public', 'files', 'LIVE_viewer.csv');
    const data = await readCSV(csvFilePath);
    await insertViewer(data);
  } catch (err) {
    console.error('Error processing CSV:', err);
  }
}

/* 
Creation
  -> TikTokRawData
      \__ date, liveDuration
*/
async function insertCreation(jsonDataObject) {
  try {
    for (const item of jsonDataObject) {

      const dateInDBFormat = convertDate(item.Date);

      const queryText = `
        INSERT INTO tikTokRawData (date, liveduration)
        VALUES ($1, $2)
        ON CONFLICT (date) DO NOTHING;
      `;


      const values = [dateInDBFormat, item.LIVEduration];


      const { rows } = await client.query(queryText, values);
      // console.log("creation indet:", rows );
      // //console.log(rows);
    }


  } catch (error) {
    // Log the error and send a generic internal server error response.
    console.error('Database query failed:', error);
    // res.status(500).send('Internal Server Error');
  }

}

/*
Earning
  -> TikTokRawData
      \__ date, diamonds, gifters
*/
async function insertEarning(jsonDataObject) {
  try {
    for (const item of jsonDataObject) {

      const dateInDBFormat = convertDate(item.Date);

      const queryText = `
        UPDATE tikTokRawData
        SET diamonds = $1, gifters = $2
        WHERE date = $3;      
      `;

      const values = [item.Diamonds, item.Gifters, dateInDBFormat];
      const { rows } = await client.query(queryText, values);
    }

    // Log the result for debugging purposes.
    // console.log(rows);

    // Send the result as a JSON response.
    // res.json(rows);

  } catch (error) {
    // Log the error and send a generic internal server error response.
    console.error('Database query failed:', error);
    // res.status(500).send('Internal Server Error');
  }

}

/*
Interactions
  -> TikTokRawData
      \__ date, newFollowers, viewersWhoCommented, likes, shares
*/

async function insertInteractions(jsonDataObject) {
  try {
    for (const item of jsonDataObject) {

      const dateInDBFormat = convertDate(item.Date);

      const queryText = `
        UPDATE tikTokRawData
        SET newfollowers = $1, viewerswhocommented = $2, likes = $3, shares = $4
        WHERE date = $5;      
      `;

      const values = [item.Newfollowers, item.Viewerswhocommented, item.Likes, item.Shares, dateInDBFormat];
      const { rows } = await client.query(queryText, values);
      //console.log(rows);
    }

    // Log the result for debugging purposes.
    // console.log(rows);

    // Send the result as a JSON response.
    // res.json(rows);

  } catch (error) {
    // Log the error and send a generic internal server error response.
    console.error('Database query failed:', error);
    // res.status(500).send('Internal Server Error');
  }

}

/*
Viewer
  -> TikTokRawData
      \__ date, totalViews, uniqueViewers, avgWatchTime, topViewerCount
*/
async function insertViewer(jsonDataObject) {
  try {
    for (const item of jsonDataObject) {

      const dateInDBFormat = convertDate(item.Date);

      const queryText = `
        UPDATE tikTokRawData
        SET totalviews = $1, uniqueviewers = $2, avgwatchtime = $3, topviewercount = $4
        WHERE date = $5;      
      `;

      const values = [item.Totalviews, item.Uniqueviewers, item.Averagewatchtime, item.Topviewercount, dateInDBFormat];
      const { rows } = await client.query(queryText, values);
      //console.log(rows);
    }

    // Log the result for debugging purposes.
    // console.log(rows);

    // Send the result as a JSON response.
    // res.json(rows);

  } catch (error) {
    // Log the error and send a generic internal server error response.
    console.error('Database query failed:', error);
    // res.status(500).send('Internal Server Error');
  }

}




// function myFunc() {
//   myFunc = function () { }; // kill it as soon as it was called
//   console.log('Output: ', readCSV('server//public//files//LIVE_viewer.csv'));
// };

// myFunc();


// Start the server and listen on the specified port
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
