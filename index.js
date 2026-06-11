const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const app = express();
app.use(express.json());

const cookieFile = '/tmp/yt_cookies.txt';
if (process.env.YOUTUBE_COOKIES) {
  const decoded = Buffer.from(process.env.YOUTUBE_COOKIES, 'base64').toString('utf8');
  fs.writeFileSync(cookieFile, decoded);
  console.log('Cookies loaded:', decoded.length);
} else {
  console.log('No cookies!');
}

const cookieArg = () => fs.existsSync(cookieFile) ? `--cookies ${cookieFile}` : '';

// Stream audio مستقیم از YouTube
app.get('/audio', (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).send('title required');
  
  const query = `${title} ${artist || ''}`;
  console.log(`Streaming: ${query}`);

  res.setHeader('Content-Type', 'audio/webm');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const args = [
    ...cookieArg().split(' ').filter(Boolean),
    `ytsearch1:${query}`,
    '--format', 'bestaudio',
    '--no-playlist',
    '--no-warnings',
    '-o', '-',  // output به stdout
  ];

  const ytdlp = spawn('yt-dlp', args);
  
  ytdlp.stdout.pipe(res);
  
  ytdlp.stderr.on('data', (data) => {
    console.error('yt-dlp:', data.toString().substring(0, 100));
  });

  ytdlp.on('close', (code) => {
    console.log(`Done streaming: ${title}, code: ${code}`);
  });

  req.on('close', () => {
    ytdlp.kill();
  });
});

app.post('/stream', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const query = `${title} ${artist || ''}`;
    console.log(`Getting URL: ${query}`);
    
    exec(`yt-dlp ${cookieArg()} "ytsearch1:${query}" --get-url --format bestaudio --no-playlist --no-warnings`, 
      { timeout: 30000 }, (error, stdout) => {
        if (error) return res.status(404).json({ error: 'not found' });
        const url = stdout.trim().split('\n')[0];
        if (!url) return res.status(404).json({ error: 'no url' });
        res.json({ url });
      });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
