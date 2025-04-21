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

const getScreenshotUrl = async (username, repoName) => {
	const branches = ["main", "master"];
	for (const branch of branches) {
		const url = `https://raw.githubusercontent.com/${username}/${repoName}/${branch}/public/screenshot.png`;
		if(isUrlValid(url)){
			return url;
		}
	}
	return ""; // if none found
};

const isUrlValid = async url => {
	let isValid = false;

	try {
		const response = await fetch(url, { method: "HEAD" });
		if (response.ok) {
			isValid = true;
		}
	} catch (err) {
		console.warn(
			`URL invalid at: ${url}:`,
			err.message
		);
	}

	return isValid;
}

const getDisplayName = async (username, repoName) => {
	let displayName = repoName;
	const readmeRes = await fetch(
		`https://api.github.com/repos/${username}/${repoName}/readme`,
		{
			headers: {
				Authorization: `token ${process.env.PERSONAL_GITHUB_TOKEN}`,
				Accept: "application/vnd.github+json",
			},
		}
	);

	// if a README is found
	if (readmeRes.ok) {
		const readmeData = await readmeRes.json();
		const content = Buffer.from(readmeData.content, "base64").toString(
			"utf-8"
		);
		// parsed from tag <!-- portfolio-meta display_name: Project Name -->
		const metaMatch = content.match(/<!--\s*portfolio-meta([\s\S]*?)-->/);
		// if meta tag found in README
		if (metaMatch) {
			const metaContent = metaMatch[1];
			const displayNameMatch = metaContent.match(/display_name:\s*(.+)/);
			if (displayNameMatch) {
				displayName = displayNameMatch[1].trim();
			}
		}
	} else {
		console.error(`Failed to fetch README: ${readmeRes.status}`);
	}

	return displayName;
};

const syncProjects = async () => {
	const GITHUB_USERNAME = "slyty7";

	const batch = db.batch();
	const portfolioRepos = await getProjectRepos();

	for (const repo of portfolioRepos) {
		const docRef = db.collection("projects").doc(repo.name);
		const screenshotPath = await getScreenshotUrl(
			GITHUB_USERNAME,
			repo.name
		);
		const socialPreviewPath = `https://opengraph.githubassets.com/1/${GITHUB_USERNAME}/${repo.name}`;
		const displayName = await getDisplayName(GITHUB_USERNAME, repo.name);

		batch.set(docRef, {
			name: displayName,
			githubUrl: repo.html_url,
			liveUrl: repo.homepage || "",
			description: repo.description || "",
			topics: repo.topics || [],
			updatedAt: repo.updated_at,
			updatedAtTimestamp: new Date(repo.updated_at).getTime(),
			createdAt: repo.created_at,
			createdAtTimestamp: new Date(repo.created_at).getTime(),
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
