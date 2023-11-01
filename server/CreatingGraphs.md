# Creating a new Endpoint

Choose an Endpoint Name: Decide on the name for your new endpoint. For this tutorial, let's create an endpoint /userDetails to fetch user details using their username.

##### Define the New Route:

In your Express.js app, define a new route for the /userDetails endpoint:

```javascript
app.get('/userDetails', async (req, res) => {
  // Your code here.
});
```

##### Extract Parameters:

Extract the necessary parameters from the request. For our example, we'll extract the username from the query parameters:

```javascript
const username = req.query.username;
console.log('Requested username:', username);
```

**Note** that the constant name (usernamein this case) is just a variable and doesn't affect the query parameter. When querying the endpoint, the format will be:

`http://localhost:3005/userDetails?username=value`

To add mulitple parameters adding more query cosnts is . ex:

```javascript
const username = req.query.username;
const id = req.query.id;
```

When querying the endpoint, the format will be:

`http://localhost:3005/views?username=value1&id=value2`

##### Create the SQL Query:

Based on what data you want to fetch, craft the SQL query. For this example, we want to get user details:

```javascript
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
const values = [username];
```

##### Execute the Query and Send the Response:

Use the PostgreSQL client to execute your query, and send the result as the response:

```javascript
try {
  const { rows } = await client.query(queryText, values);
  res.send(rows);
} catch (error) {
  console.error('Database query failed:', error);
  res.status(500).send('Internal Server Error');
}
```

##### Final /userDetails Endpoint:

Combining all the pieces, your new endpoint should look like this:

```javascript
app.get('/userDetails', async (req, res) => {
  const username = req.query.username;
  console.log('Requested username:', username);

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
  const values = [username];

  try {
    const { rows } = await client.query(queryText, values);
    res.send(rows);
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).send('Internal Server Error');
  }
});
```

# Creating a Chart in the front end

the easiest thing to do is to copy one of the currently used line or bar charts to create a new graph. however a few things need to be chagned:

##### Mapping the Values

```javascript
const graphData = apiData.map((item) => ({
    date: formatDateString(item.date),
    newfollowersperminute: item.newfollowersperminute !== null ? parseFloat(item.newfollowersperminute) : null,
    likesperminute: item.likesperminute !== null ? parseFloat(item.likesperminute) : null,
    viewerswhocommentedperminute: item.viewerswhocommentedperminute !== null ? parseFloat(item.viewerswhocommentedperminute) : null,
    sharesperminute: item.sharesperminute !== null ? parseFloat(item.sharesperminute) : null,
  }));
```

each fo the set values like newfollwoersperminute MUST match the name of the query AS value. i.e: `item.newfollwoersperminute` . that is the JSON header, **they are all lowercase**.

##### Creating Labels and Graph Views

inside the chartData you add labels in the dataset. setting a label, bordercolor, width and the data. The data mappingis the improtant part `filteredData.map((item) => item.newfollowersperminute),`  this will map the JSON values to the graph.

```javascript
const chartData = {
    labels: filteredData.map((item) => item.date),
    datasets: [
      {
        label: "New Followers/Min",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
        data: filteredData.map((item) => item.newfollowersperminute),
      },
      {
        label: "Likes/Min",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
        data: filteredData.map((item) => item.likesperminute),
      },
      {
        label: "Viewers Who Commented/Min",
        borderColor: "rgba(255, 159, 64, 1)",
        borderWidth: 1,
        data: filteredData.map((item) => item.viewerswhocommentedperminute),
      },
      {
        label: "Shares/Min",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        data: filteredData.map((item) => item.sharesperminute),
      },
    ],
  };
```
