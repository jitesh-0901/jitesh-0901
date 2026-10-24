const fs = require('fs');
const path = require('path');

const USERNAME = 'jitesh-0901';
const REPO_EXCLUDES = ['jitesh-0901']; // exclude the profile repo itself

// Known custom descriptions or links if GitHub metadata is empty
const CUSTOM_METADATA = {
  'Claxic-': {
    desc: 'Interactive Education Technology Platform for student and course workflows',
    live: 'https://claxic.vercel.app',
    tech: 'React, JavaScript, Tailwind CSS, Node.js'
  },
  'Captrix-Software': {
    desc: 'Intelligent financial data evaluation and algorithmic analysis software',
    live: '',
    tech: 'Algorithms, Data Logic'
  },
  'surprise-14': {
    desc: 'Interactive celebratory web application experience',
    live: 'https://surprise-14.vercel.app',
    tech: 'JavaScript, CSS3'
  }
};

async function fetchRepos() {
  const headers = {
    'User-Agent': 'Node-GitHub-Profile-Updater',
    'Accept': 'application/vnd.github.v3+json'
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/users/${USERNAME}/repos?sort=pushed&direction=desc&per_page=100`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to fetch repos: ${res.status} ${res.statusText}`);
  }

  const repos = await res.json();
  return repos.filter(r => !r.fork && !REPO_EXCLUDES.includes(r.name));
}

function generateMarkdownTable(repos) {
  let table = '| Project | Description | Primary Tech | Links |\n';
  table += '| :--- | :--- | :--- | :--- |\n';

  for (const r of repos) {
    const custom = CUSTOM_METADATA[r.name] || {};
    const desc = custom.desc || r.description || 'Personal project & software application';
    const tech = custom.tech || r.language || 'Code';
    const liveUrl = custom.live || r.homepage || '';

    const links = [];
    if (liveUrl) {
      links.push(`[**Live Demo ↗**](${liveUrl})`);
    }
    links.push(`[**GitHub ↗**](${r.html_url})`);

    const linkStr = links.join(' &nbsp;&bull;&nbsp; ');

    table += `| **[${r.name}](${r.html_url})** | ${desc} | \`${tech}\` | ${linkStr} |\n`;
  }

  return table;
}

async function main() {
  try {
    console.log(`Fetching latest public repos for ${USERNAME}...`);
    const repos = await fetchRepos();
    console.log(`Found ${repos.length} public repos.`);

    const generatedTable = generateMarkdownTable(repos);

    const readmePath = path.join(__dirname, '..', 'README.md');
    let content = fs.readFileSync(readmePath, 'utf8');

    const startMarker = '<!-- RECENT_REPOS:START -->';
    const endMarker = '<!-- RECENT_REPOS:END -->';

    const startIndex = content.indexOf(startMarker);
    const endIndex = content.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1) {
      console.warn('Markers <!-- RECENT_REPOS:START --> and <!-- RECENT_REPOS:END --> not found in README.md.');
      return;
    }

    const newContent =
      content.substring(0, startIndex + startMarker.length) +
      '\n' +
      generatedTable +
      content.substring(endIndex);

    fs.writeFileSync(readmePath, newContent, 'utf8');
    console.log('Successfully updated README.md with recent projects!');
  } catch (err) {
    console.error('Error updating projects:', err);
    process.exit(1);
  }
}

main();
