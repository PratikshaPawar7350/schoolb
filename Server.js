const express = require('express');
const mysql = require('mysql2'); // Use mysql2 instead of mysql
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// MySQL Connection Pool with proper authPlugins option
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  authPlugins: {
    mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD + '\0')
  }
});

// Custom query function to execute SQL queries
const query = (sql, params) => {
  return new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) {
        reject(err);
        return;
      }

      connection.query(sql, params, (err, rows) => {
        connection.release();

        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  });
};

// Routes
app.get('/chapter', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM chapters');
    res.json(rows);
  } catch (err) {
    console.error('Error executing database query:', err);
    res.status(500).json({ error: 'Error fetching data from the database', details: err.message });
  }
});

function bufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

// Route to fetch syllabus data
// Route to fetch syllabus data filtered by standred
app.get('/syllabus', (req, res) => {
  const { standred } = req.query; // Extract standred from query parameters

  // Construct the SQL query with optional standred filter
  let query = 'SELECT id, syllabusname, image, standred FROM syllabus';
  const queryParams = [];

  if (standred) {
    query += ' WHERE standred = ?';
    queryParams.push(standred);
  }

  pool.query(query, queryParams, (error, results) => {
    if (error) {
      console.error('Error fetching syllabus data:', error);
      return res.status(500).json({ error: 'Error fetching syllabus data' });
    }

    // Map results and convert image data to base64
    const syllabusData = results.map(syllabus => ({
      id: syllabus.id,
      syllabusname: syllabus.syllabusname,
      standred: syllabus.standred,
      // Convert image buffer to base64
      image: bufferToBase64(syllabus.image)
    }));

    res.json(syllabusData);
  });
});





app.get('/chapterdetails', async (req, res) => {
  const chapterName = req.query.name;
  const queryStr = `
    SELECT * 
    FROM chapterdetails 
    INNER JOIN chapters ON chapterdetails.subjectname = chapters.name 
    WHERE chapterdetails.subjectname = ?`;

  try {
    const rows = await query(queryStr, [chapterName]);
    res.json(rows);
  } catch (err) {
    console.error('Error executing database query:', err);
    res.status(500).json({ error: 'Error fetching data from the database', details: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
