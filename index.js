const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json());

const cookieFile = '/tmp/yt_cookies.txt';
if (process.env.YOUTUBE_COOKIES) {
  const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, 'base64').toString('utf8');
  fs.writeFileSync(cookieFile, decoded);
  console.log('Cookies loaded');
}

const cookieArg = () => fs.existsSync(cookieFile) ? `--cookies ${cookieFile}` : '';

app.get('/audio', (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).send('title required');

  const query = `${title} ${artist || ''}`;
  const tmpFile = `/tmp/${Date.now()}.m4a`;
  console.log(`Downloading: ${query}`);

  // yt-dlp + ffmpeg تبدیل به m4a که iOS پشتیبانی میکنه
  const command = `yt-dlp ${cookieArg()} "ytsearch1:${query}" --format "bestaudio" --extract-audio --audio-format m4a --audio-quality 128K --no-playlist --no-warnings -o "${tmpFile}"`;

  exec(command, { timeout: 90000 }, (error) => {
    // فایل ممکنه با extension متفاوت ذخیره شده باشه
    const possibleFiles = [tmpFile, tmpFile.replace('.m4a', '.m4a.m4a'), tmpFile.replace('.m4a', '')];
    const actualFile = possibleFiles.find(f => fs.existsSync(f));
    
    if (error || !actualFile) {
      console.error('Failed:', error?.message?.substring(0, 200));
      return res.status(404).send('not found');
    }

    const stat = fs.statSync(actualFile);
    console.log(`Serving ${title}, size: ${stat.size}`);
    
    res.setHeader('Content-Type', 'audio/mp4');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const stream = fs.createReadStream(actualFile);
    stream.pipe(res);
    stream.on('end', () => fs.unlink(actualFile, () => {}));
    req.on('close', () => { try { fs.unlink(actualFile, () => {}); } catch(e) {} });
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
