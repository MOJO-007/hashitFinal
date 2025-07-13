import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';

import { importer } from 'ipfs-unixfs-importer';
import { MemoryBlockstore } from 'blockstore-core';
import all from 'it-all';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
const upload = multer({ storage: multer.memoryStorage() });

// ---- UTIL: CID calculator ----
async function calculateCidFromBuffer(buffer, filename = 'file') {
    const blockstore = new MemoryBlockstore();

    const entries = await all(
        importer(
            [{ path: filename, content: buffer }],
            blockstore,
            {
                cidVersion: 1,
                rawLeaves: true,
            }
        )
    );

    const cid = entries[entries.length - 1].cid;
    return cid.toString();
}

// ---- /upload: Upload file to Pinata ----
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
        const formData = new FormData();
        formData.append('file', req.file.buffer, req.file.originalname);

        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                maxBodyLength: Infinity,
                headers: {
                    ...formData.getHeaders(),
                    pinata_api_key: process.env.PINATA_API_KEY,
                    pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
                },
            }
        );

        const { IpfsHash } = response.data;

        res.status(200).json({
            cid: IpfsHash,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${IpfsHash}`,
        });
    } catch (error) {
        console.error('Pinata upload error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to upload to Pinata.' });
    }
});

// ---- /calculate-cid: Calculate CID locally ----
app.post('/calculate-cid', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    try {
        const cid = await calculateCidFromBuffer(req.file.buffer, req.file.originalname);
        res.status(200).json({ cid });
    } catch (error) {
        console.error('CID calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate CID.' });
    }
});

// ---- Start Server ----
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
