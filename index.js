'use strict'

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { program } = require('commander');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const upload = multer();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('static'));

program
    .option('-h, --host <host>', 'host', '0.0.0.0')
    .option('-p, --port <port>', 'port', 8000)
    .option('-c, --cache <cache>', 'cache', './cache/notes.json');

program.parse(process.argv);

const { host = '0.0.0.0', port = 8000, cache = './cache/notes.json' } = process.env;
console.log(`Host: ${host}, Port: ${port}, Cache: ${cache}`);


if (!fs.existsSync(cache)) {
    fs.writeFileSync(cache, JSON.stringify([])); // Initialize as an empty array
    console.log(`Cache file created at ${cache}`);
} else {
    console.log(`Cache file found at ${cache}`);
}

// Swagger setup
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Notes API',
            version: '1.0.0',
            description: 'API documentation for the Notes service',
        },
        servers: [
            {
                url: `http://${host}:${port}`,
            },
        ],
    },
    apis: ['./index.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

/**
 * @swagger
 * /:
 *   get:
 *     description: Serve the upload form
 *     responses:
 *       200:
 *         description: HTML form
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'UploadForm.html'));
});

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     description: Get a note by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the note
 *     responses:
 *       200:
 *         description: Note content
 *       404:
 *         description: Note not found
 */
app.get('/notes/:name', (req, res) => {
    const { name } = req.params;
    const cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        res.status(500).send('Cache is not in the correct format');
        return;
    }
    const note = cacheJSON.find(note => note.name === name);
    if (note) {
        res.status(200).send(note);
    } else {
        res.status(404).send('Note not found');
    }
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     description: Update a note by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the note
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated
 *       404:
 *         description: Note not found
 *       500:
 *         description: Cache is not in the correct format
 */
app.put('/notes/:name', (req, res) => {
    const { name } = req.params;
    const { content } = req.body;
    let cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        res.status(500).send('Cache is not in the correct format');
        return;
    }
    const noteIndex = cacheJSON.findIndex(note => note.name === name);
    if (noteIndex === -1) {
        res.status(404).send('Note not found');
        return;
    }
    cacheJSON[noteIndex].text = content;
    fs.writeFile(cache, JSON.stringify(cacheJSON), () => {});
    res.status(200).send('Note updated');
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     description: Delete a note by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the note
 *     responses:
 *       200:
 *         description: Note deleted
 *       404:
 *         description: Note not found
 *       500:
 *         description: Cache is not in the correct format
 */
app.delete('/notes/:name', (req, res) => {
    const { name } = req.params;
    let cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        res.status(500).send('Cache is not in the correct format');
        return;
    }
    const noteIndex = cacheJSON.findIndex(note => note.name === name);
    if (noteIndex === -1) {
        res.status(404).send('Note not found');
        return;
    }
    cacheJSON.splice(noteIndex, 1);
    fs.writeFile(cache, JSON.stringify(cacheJSON), () => {});
    res.status(200).send('Note deleted');
});

/**
 * @swagger
 * /notes:
 *   get:
 *     description: Get all notes
 *     responses:
 *       200:
 *         description: List of notes
 *       500:
 *         description: Cache is not in the correct format
 */
app.get('/notes', (req, res) => {
    const cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        res.status(500).send('Cache is not in the correct format');
        return;
    }
    res.status(200).send(cacheJSON);
});

/**
 * @swagger
 * /write:
 *   post:
 *     description: Create a new note
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note saved
 *       400:
 *         description: Note already exists
 *       500:
 *         description: Cache is not in the correct format
 */
app.post('/write', upload.none(), (req, res) => {
    const { note_name, note } = req.body;
    let cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        cacheJSON = [];
    }
    if (cacheJSON.some(n => n.name === note_name)) {
        res.status(400).send('Note already exists');
        return;
    }
    cacheJSON.push({ name: note_name, text: note });
    fs.writeFile(cache, JSON.stringify(cacheJSON), () => {});
    res.status(201).send('Note saved');
});



app.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}`);
});