import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { MemoryBlockstore } from 'blockstore-core';

const app = express();
const PORT = 4000;

// Global Helia node
let helia;
let fs;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- UPLOAD ENDPOINT ---
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log(`Received file for upload: ${req.file.originalname}`);
    try {
        const cid = await fs.addBytes(req.file.buffer);
        console.log(`Helia upload success. CID: ${cid.toString()}`);
        res.status(200).json({ cid: cid.toString() });
    } catch (error) {
        console.error('Helia upload error:', error);
        res.status(500).json({ error: 'Failed to upload to Helia.' });
    }
});

// --- CALCULATE CID WITHOUT STORING ---
app.post('/calculate-cid', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided for CID calculation.' });
    }

    console.log(`Received file for CID calculation: ${req.file.originalname}`);
    try {
        const transientBlockstore = new MemoryBlockstore();
        const transientHelia = await createHelia({ blockstore: transientBlockstore });
        const transientFs = unixfs(transientHelia);

        const cid = await transientFs.addBytes(req.file.buffer);
        console.log(`CID calculated without storing. CID: ${cid.toString()}`);

        await transientHelia.stop();

        res.status(200).json({ cid: cid.toString() });
    } catch (error) {
        console.error('Helia CID calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate Helia CID.' });
    }
});

async function main() {
    try {
        console.log('Initializing Helia node...');
        helia = await createHelia();
        fs = unixfs(helia);
        console.log('✅ Helia node is ready.');

        app.listen(PORT, () =>
            console.log(`Backend server listening on http://localhost:${PORT}`)
        );
    } catch (error) {
        console.error('Failed to initialize Helia node:', error);
        process.exit(1);
    }
}

main();
