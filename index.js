const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const https = require('https');
const http = require('http');
const app = express();
app.use(express.json());

const cookieFile = '/tmp/yt_cookies.txt';
if (process.env.YOUTUBE_COOKIES) {
  const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, 'base64').toString('utf8');
  fs.writeFileSync(cookieFile, decoded);
  console.log('YouTube cookies loaded, size:', decoded.length);
} else {
  console.log('NO YOUTUBE_COOKIES env var found!');
}

function getYouTubeUrl(query) {
  return new Promise((resolve, reject) => {
    const cookieArg = fs.existsSync(cookieFile) ? `--cookies ${cookieFile}` : '';
    const command = `yt-dlp ${cookieArg} "ytsearch1:${query}" --get-url --format bestaudio --no-playlist --no-warnings`;
    exec(command, { timeout: 30000 }, (error, stdout) => {
      if (error) return reject(error);
      const url = stdout.trim().split('\n')[0];
      if (!url) return reject(new Error('no url'));
      resolve(url);
    });
  });
}

// URL رو برگردون
app.post('/stream', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const query = `${title} ${artist}`;
    console.log(`Searching: ${query}`);
    const url = await getYouTubeUrl(query);
    console.log(`Found for: ${title}`);
    res.json({ url });
  } catch (e) {
    console.error('Error:', e.message);
    res.status(404).json({ error: 'not found' });
  }
});

// Proxy endpoint — سرور audio رو دانلود و stream میکنه
app.get('/proxy', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).send('title required');
    const query = `${title} ${artist || ''}`;
    console.log(`Proxy searching: ${query}`);
    
    const cookieArg = fs.existsSync(cookieFile) ? `--cookies ${cookieFile}` : '';
    const command = `yt-dlp ${cookieArg} "ytsearch1:${query}" --get-url --format bestaudio --no-playlist --no-warnings`;
    
    exec(command, { timeout: 30000 }, (error, stdout) => {
      if (error) return res.status(404).send('not found');
      const audioUrl = stdout.trim().split('\n')[0];
      if (!audioUrl) return res.status(404).send('no url');
      
      // Redirect به URL — just_audio میتونه با redirect کار کنه
      res.redirect(302, audioUrl);
    });
  } catch (e) {
    res.status(500).send('error');
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
