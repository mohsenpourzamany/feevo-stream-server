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

// دانلود و serve به عنوان mp3
app.get('/audio', (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).send('title required');

  const query = `${title} ${artist || ''}`;
  const tmpFile = `/tmp/${Date.now()}.mp3`;
  console.log(`Downloading: ${query}`);

  const command = `yt-dlp ${cookieArg()} "ytsearch1:${query}" --format bestaudio --extract-audio --audio-format mp3 --audio-quality 128K --no-playlist --no-warnings -o "${tmpFile}"`;

  exec(command, { timeout: 60000 }, (error) => {
    if (error || !fs.existsSync(tmpFile)) {
      console.error('Download failed:', error?.message);
      return res.status(404).send('not found');
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const stream = fs.createReadStream(tmpFile);
    stream.pipe(res);
    stream.on('end', () => {
      fs.unlink(tmpFile, () => {});
    });
  });
});

app.post('/stream', (req, res) => {
  const { title, artist } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const audioUrl = `${req.protocol}://${req.get('host')}/audio?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || '')}`;
  res.json({ url: audioUrl });
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
