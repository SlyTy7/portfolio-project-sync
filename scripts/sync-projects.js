// scripts/sync-projects.js
import fetch from 'node-fetch';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load Firebase credentials from environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const GITHUB_USERNAME = 'slyty7';
const GITHUB_API = `https://api.github.com/users/${GITHUB_USERNAME}/repos`;

const syncProjects = async () => {
  console.log('Fetching GitHub repos...');

  const response = await fetch(GITHUB_API, {
    headers: {
      Authorization: `token ${process.env.PERSONAL_GITHUB_TOKEN}`,
      'User-Agent': 'portfolio-sync-script',
    },
  });


  console.log("GitHub Token used:", process.env.PERSONAL_GITHUB_TOKEN ? "✔️ Loaded" : "❌ Missing");

  console.log(response);


  const repos = await response.json();

  // Filter only repos with topic 'portfolio-project'
  const portfolioRepos = repos.filter(repo =>
    repo.topics?.includes('portfolio-project')
  );

  console.log(`Found ${portfolioRepos.length} portfolio projects.`);

  const batch = db.batch();

  portfolioRepos.forEach((repo) => {
    const docRef = db.collection('projects').doc(repo.name);
    batch.set(docRef, {
      name: repo.name,
      githubUrl: repo.html_url,
      liveUrl: repo.homepage || '',
      description: repo.description || '',
      topics: repo.topics || [],
      updatedAt: repo.updated_at,
    });
  });

  await batch.commit();
  console.log('Projects synced to Firebase.');
};

syncProjects().catch((err) => {
  console.error('Error syncing projects:', err);
  process.exit(1);
});
