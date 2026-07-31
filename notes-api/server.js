const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')

const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// TODO: your sticky-notes routes go here, e.g.
//   GET    /api/notes       -> list all notes
//   POST   /api/notes       -> insert a new note (req.body.text)
//   DELETE /api/notes/:id   -> remove a note
// Use pool.query(...) to talk to Postgres — see init.sql for where to
// define the table these routes will read/write.

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`notes-api listening on ${port}`))
