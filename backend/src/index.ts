// --- backend/index.ts (using Helia) ---

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';
import { MemoryBlockstore } from 'blockstore-core';
import type { Helia } from '@helia/interface';
import type { UnixFS } from '@helia/unixfs';

const app = express();
const PORT = 4000;

// The main Helia node for persistent storage
let helia: Helia;
let fs: UnixFS;

app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- UPLOAD ENDPOINT (stores the file) ---
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }
    console.log(`Received file for upload: ${req.file.originalname}`);
    try {
        // Use the main UnixFS instance to add the file, which stores it
        const cid = await fs.addBytes(req.file.buffer);
        console.log(`Helia upload success. CID: ${cid.toString()}`);
        res.status(200).json({ cid: cid.toString() });
    } catch (error) {
        console.error('Helia upload error:', error);
        res.status(500).json({ error: 'Failed to upload to Helia.' });
    }
});

// --- CID CALCULATION ENDPOINT (does not store the file) ---
app.post('/calculate-cid', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file provided for CID calculation.' });
    }
    console.log(`Received file for CID calculation: ${req.file.originalname}`);
    try {
        // To avoid storing the file, we create a temporary, in-memory blockstore
        // that is not connected to our main Helia node.
        const transientBlockstore = new MemoryBlockstore();

        // Create a temporary Helia instance with this blockstore
        const transientHelia = await createHelia({ blockstore: transientBlockstore });

        // Create a temporary unixfs instance from the transient Helia node
        const transientFs = unixfs(transientHelia);

        // Calculate the CID using the temporary instance. The data is "stored"
        // only in the transient blockstore, which is discarded after this request.
        const cid = await transientFs.addBytes(req.file.buffer);

        console.log(`CID calculated without storing. CID: ${cid.toString()}`);

        // Stop the transient node to release resources
        await transientHelia.stop();

        // Return the calculated CID
        res.status(200).json({ cid: cid.toString() });
    } catch (error) {
        console.error('Helia CID calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate Helia CID.' });
    }
});


/**
 * Main function to initialize the primary Helia node and start the Express server.
 */
async function main() {
    try {
        console.log('Initializing Helia node...');
        // Create our main Helia node that will persist blocks
        helia = await createHelia();
        // Create a UnixFS instance associated with our main node
        fs = unixfs(helia);

        console.log('✅ Helia node is ready.');

        app.listen(PORT, () => console.log(`Backend server listening on http://localhost:${PORT}`));
    } catch (error) {
        console.error('Failed to initialize Helia node:', error);
        process.exit(1);
    }
}

// Start the server
main();