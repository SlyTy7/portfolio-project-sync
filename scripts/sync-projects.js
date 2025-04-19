import fetch from "node-fetch";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load Firebase credentials from environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const getProjectRepos = async () => {
	// github api endpoint to get public and private reps of authenticated user
	const GITHUB_REPO_API = `https://api.github.com/user/repos?per_page=100`;
	const response = await fetch(GITHUB_REPO_API, {
		headers: {
			Authorization: `token ${process.env.PERSONAL_GITHUB_TOKEN}`,
			"User-Agent": "portfolio-sync-script",
			"Cache-Control": "no-cache",
			Accept: "application/vnd.github+json",
		},
	});
	// check for errors
	if (!response.ok) {
		throw new Error(
			`GitHub API error: ${response.status} ${response.statusText}`
		);
	}

	const repos = await response.json();
	// Filter only repos with topic 'portfolio-project'
	const portfolioRepos = repos.filter((repo) =>
		repo.topics?.includes("portfolio-project")
	);

	console.log(`Found ${portfolioRepos.length} portfolio projects.`);

	return portfolioRepos;
};

const checkScreenshotUrl = async (username, repoName) => {
	const branches = ["main", "master"];
	for (const branch of branches) {
		const url = `https://raw.githubusercontent.com/${username}/${repoName}/${branch}/public/screenshot.png`;
		try {
			const response = await fetch(url, { method: "HEAD" });
			if (response.ok) {
				return url;
			}
		} catch (err) {
			console.warn(
				`Error checking screenshot URL for ${repoName}:`,
				err.message
			);
		}
	}
	return ""; // if none found
};

const syncProjects = async () => {
	const GITHUB_USERNAME = "slyty7";

	const batch = db.batch();
	const portfolioRepos = await getProjectRepos();

	for (const repo of portfolioRepos) {
		const docRef = db.collection("projects").doc(repo.name);
		const screenshotPath = await checkScreenshotUrl(
			GITHUB_USERNAME,
			repo.name
		);
		const socialPreviewPath = `https://opengraph.githubassets.com/1/${GITHUB_USERNAME}/${repo.name}`;

		batch.set(docRef, {
			name: repo.name,
			githubUrl: repo.html_url,
			liveUrl: repo.homepage || "",
			description: repo.description || "",
			topics: repo.topics || [],
			updatedAt: repo.updated_at,
			createdAt: repo.created_at,
			screenshot: screenshotPath,
			socialPreview: socialPreviewPath,
		});
	}

	await batch.commit();
	console.log("Projects synced to Firebase.");
};

syncProjects().catch((err) => {
	console.error("Error syncing projects:", err);
	process.exit(1);
});
