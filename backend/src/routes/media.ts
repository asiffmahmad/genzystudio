import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import prisma from '../prisma';

const router = Router();

// Store files in memory so we can save directly to MySQL (no filesystem)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
    }
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const checksum = crypto.createHash('md5').update(req.file.buffer).digest('hex');

    const media = await prisma.mediaAsset.create({
      data: {
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        data: req.file.buffer, // LONGBLOB
        checksum
      }
    });

    res.json({
      success: true,
      data: {
        id: media.id,
        fileName: media.fileName,
        mimeType: media.mimeType,
        url: `/api/media/${media.id}`
      }
    });
  } catch (error) {
    console.error('Media upload error:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Endpoint to retrieve media BLOB
router.get('/:id', async (req, res) => {
  try {
    const media = await prisma.mediaAsset.findUnique({
      where: { id: req.params.id }
    });

    if (!media) {
      return res.status(404).send('Media not found');
    }

    res.setHeader('Content-Type', media.mimeType);
    res.setHeader('Content-Length', media.fileSize);
    // Cache for 1 year since media is immutable
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    res.send(media.data);
  } catch (error) {
    console.error('Media retrieval error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
