const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
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

app.post('/stream', async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const query = `${title} ${artist}`;
    console.log(`Searching: ${query}`);

    const cookieExists = fs.existsSync(cookieFile);
    console.log('Cookie file exists:', cookieExists);
    const cookieArg = cookieExists ? `--cookies ${cookieFile}` : '';
    const command = `yt-dlp ${cookieArg} "ytsearch1:${query}" --get-url --format bestaudio --no-playlist --no-warnings`;
    console.log('Running:', command.substring(0, 80));
    
    exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp error:', error.message.substring(0, 200));
        return res.status(404).json({ error: 'not found' });
      }
      const url = stdout.trim().split('\n')[0];
      if (!url) return res.status(404).json({ error: 'no url' });
      console.log(`Found URL for: ${title}`);
      res.json({ url });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
