const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const cookieFile = '/tmp/yt_cookies.txt';
if (process.env.YOUTUBE_COOKIES) {
  const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, 'base64').toString('utf8');
  fs.writeFileSync(cookieFile, decoded);
  console.log('Cookies loaded');
}

const cookieArg = () => fs.existsSync(cookieFile) ? `--cookies ${cookieFile}` : '';
const cache = {};

app.post('/stream', async (req, res) => {
  const { title, artist } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const key = `${title}-${artist}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const cacheFile = `/tmp/${key}.m4a`;

  // اگه cache داریم سریع جواب بده
  if (fs.existsSync(cacheFile)) {
    console.log(`Cache hit: ${title}`);
    return res.json({ url: `${req.protocol}://${req.get('host')}/file/${key}` });
  }

  const query = `${title} ${artist || ''}`;
  console.log(`Downloading: ${query}`);

  const command = `yt-dlp ${cookieArg()} "ytsearch1:${query}" --format "bestaudio" --extract-audio --audio-format m4a --audio-quality 128K --no-playlist --no-warnings -o "${cacheFile}"`;

  exec(command, { timeout: 90000 }, (error) => {
    if (error || !fs.existsSync(cacheFile)) {
      console.error('Failed:', error?.message?.substring(0, 150));
      return res.status(404).json({ error: 'not found' });
    }
    console.log(`Ready: ${title}`);
    res.json({ url: `${req.protocol}://${req.get('host')}/file/${key}` });
  });
});

// Serve فایل کامل
app.get('/file/:key', (req, res) => {
  const cacheFile = `/tmp/${req.params.key}.m4a`;
  if (!fs.existsSync(cacheFile)) return res.status(404).send('not found');
  
  const stat = fs.statSync(cacheFile);
  res.setHeader('Content-Type', 'audio/mp4');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Access-Control-Allow-Origin', '*');
  fs.createReadStream(cacheFile).pipe(res);
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
