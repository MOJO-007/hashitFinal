import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { create } from 'ipfs-http-client';
const app = express();
const PORT = 4000;
let ipfs: any;
try {
    ipfs = create({ url: 'http://127.0.0.1:5001' });
    console.log('Successfully connected to local IPFS node.');
} catch (error) {
    console.error('Failed to connect to IPFS. Is the daemon running?');
    process.exit(1);
}
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({ storage });
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    console.log("Received file: ${ req.file.originalname }");
    try {
        const result = await ipfs.add(req.file.buffer);
        console.log("IPFS upload success.CID: ${ result.cid.toString() }");
        res.status(200).json({ cid: result.cid.toString() });
    } catch (error: any) {
        console.error('IPFS upload error:', error);
        res.status(500).json({ error: 'Failed to upload to IPFS.' });
    }
});
app.listen(PORT, () => console.log('Backend server listening on http://localhost:${PORT}'));