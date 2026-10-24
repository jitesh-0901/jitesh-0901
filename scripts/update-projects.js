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

async function fetchRepos(headers) {
  const url = `https://api.github.com/users/${USERNAME}/repos?sort=pushed&direction=desc&per_page=100`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to fetch repos: ${res.status} ${res.statusText}`);
  }

  const repos = await res.json();
  return repos.filter(r => !r.fork && !REPO_EXCLUDES.includes(r.name));
}

async function fetchRecentEvents(headers) {
  try {
    const url = `https://api.github.com/users/${USERNAME}/events/public?per_page=20`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch events:', err.message);
    return [];
  }
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

function generateActivityMarkdown(events) {
  if (!events || !events.length) {
    return '- 🚀 Actively coding and maintaining software projects on GitHub';
  }

  const lines = [];
  const seen = new Set();

  for (const e of events) {
    if (lines.length >= 5) break;
    const repoName = e.repo ? e.repo.name.replace(`${USERNAME}/`, '') : '';
    const repoUrl = e.repo ? `https://github.com/${e.repo.name}` : '#';
    const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let action = '';
    if (e.type === 'PushEvent') {
      const commitsCount = e.payload && e.payload.commits ? e.payload.commits.length : 1;
      const key = `push-${repoName}-${date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      action = `🔨 Pushed ${commitsCount} commit${commitsCount > 1 ? 's' : ''} to [**${repoName}**](${repoUrl}) &bull; *${date}*`;
    } else if (e.type === 'CreateEvent') {
      action = `✨ Created ${e.payload.ref_type || 'repository'} [**${repoName}**](${repoUrl}) &bull; *${date}*`;
    } else if (e.type === 'WatchEvent') {
      action = `⭐ Starred repository [**${e.repo.name}**](https://github.com/${e.repo.name}) &bull; *${date}*`;
    } else if (e.type === 'PublicEvent') {
      action = `🚀 Made repository [**${repoName}**](${repoUrl}) public &bull; *${date}*`;
    } else if (e.type === 'PullRequestEvent') {
      action = `🔀 ${e.payload.action} pull request on [**${repoName}**](${repoUrl}) &bull; *${date}*`;
    }

    if (action) {
      lines.push(`- ${action}`);
    }
  }

  return lines.length ? lines.join('\n') : '- 🚀 Actively coding and maintaining software projects on GitHub';
}

function replaceBetween(content, startMarker, endMarker, replacement) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.warn(`Markers ${startMarker} and ${endMarker} not found.`);
    return content;
  }

  return (
    content.substring(0, startIndex + startMarker.length) +
    '\n' +
    replacement +
    '\n' +
    content.substring(endIndex)
  );
}

async function main() {
  try {
    const headers = {
      'User-Agent': 'Node-GitHub-Profile-Updater',
      'Accept': 'application/vnd.github.v3+json'
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    console.log(`Fetching latest public repos & events for ${USERNAME}...`);
    const [repos, events] = await Promise.all([
      fetchRepos(headers),
      fetchRecentEvents(headers)
    ]);

    console.log(`Found ${repos.length} repos, ${events.length} events.`);

    const generatedTable = generateMarkdownTable(repos);
    const generatedActivity = generateActivityMarkdown(events);

    const readmePath = path.join(__dirname, '..', 'README.md');
    let content = fs.readFileSync(readmePath, 'utf8');

    // Update Repos Table
    content = replaceBetween(content, '<!-- RECENT_REPOS:START -->', '<!-- RECENT_REPOS:END -->', generatedTable.trim());

    // Update Recent Activity List
    content = replaceBetween(content, '<!-- RECENT_ACTIVITY:START -->', '<!-- RECENT_ACTIVITY:END -->', generatedActivity.trim());

    // Add/Update Cache-Buster Timestamp for Stats Images so GitHub proxy serves live numbers
    const now = Date.now();
    content = content.replace(/(&t=\d+)/g, '');
    content = content.replace(
      /(https:\/\/github-readme-streak-stats\.herokuapp\.com\/[^\s"'>]+)/g,
      (match) => (match.includes('?') ? `${match}&t=${now}` : `${match}?t=${now}`)
    );
    content = content.replace(
      /(https:\/\/github-readme-stats\.vercel\.app\/api[^\s"'>]+)/g,
      (match) => (match.includes('?') ? `${match}&t=${now}` : `${match}?t=${now}`)
    );

    fs.writeFileSync(readmePath, content, 'utf8');
    console.log('Successfully updated README.md with live repos and activity!');
  } catch (err) {
    console.error('Error updating profile:', err);
    process.exit(1);
  }
}

main();
