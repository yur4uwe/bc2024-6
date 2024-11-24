const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { program } = require('commander');

const app = express();
const upload = multer();

app.use(express.json());
app.use(express.static('static'));

program
    .requiredOption('-h, --host <host>', 'host')
    .requiredOption('-p, --port <port>', 'port')
    .requiredOption('-c, --cache <cache>', 'cache');

program.parse(process.argv);

const { host, port, cache } = program.opts();


if (!fs.existsSync(cache)) {
    fs.writeFileSync(cache, JSON.stringify([])); // Initialize as an empty array
    console.log(`Cache file created at ${cache}`);
} else {
    console.log(`Cache file found at ${cache}`);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'UploadForm.html'));
});

app.get('/notes/:name', (req, res) => {
    const { name } = req.params;
    const cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        res.status(500).send('Cache is not in the correct format');
        return;
    }
    const note = cacheJSON.find(note => note.name === name);
    if (note) {
        res.status(200).send(note.text);
    } else {
        res.status(404).send('Note not found');
    }
});

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
    fs.writeFileSync(cache, JSON.stringify(cacheJSON));
    res.status(200).send('Note saved');
});

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
    fs.writeFileSync(cache, JSON.stringify(cacheJSON));
    res.status(200).send('Note deleted');
});

app.get('/notes', (req, res) => {
    const cacheJSON = JSON.parse(fs.readFileSync(cache));
    if (!Array.isArray(cacheJSON)) {
        res.status(500).send('Cache is not in the correct format');
        return;
    }
    res.status(200).send(cacheJSON);
});

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
    fs.writeFileSync(cache, JSON.stringify(cacheJSON));
    res.status(201).send('Note saved');
});

app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});