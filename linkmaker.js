// Match Python's urllib.parse.quote(s, safe="") — also encodes ! * ' ( )
// which encodeURIComponent leaves alone.
function quoteAll(s) {
  return encodeURIComponent(s).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

export function makeLink(notebookUrl, permalink) {
  const blobIdx = notebookUrl.indexOf("/blob/");
  if (blobIdx === -1) {
    throw new Error(
      "Notebook URL must be a GitHub blob URL (e.g. https://github.com/owner/repo/blob/<branch>/path/to/notebook.ipynb)"
    );
  }

  const gitRepoUrl = notebookUrl.slice(0, blobIdx);
  const afterBlob = notebookUrl.slice(blobIdx + "/blob/".length);
  const slashAfterBranch = afterBlob.indexOf("/");
  if (slashAfterBranch === -1) {
    throw new Error("Notebook URL is missing a path after the branch.");
  }
  const branch = afterBlob.slice(0, slashAfterBranch);
  const notebookPath = afterBlob.slice(slashAfterBranch + 1);
  const repoName = gitRepoUrl.slice(gitRepoUrl.lastIndexOf("/") + 1);
  const notebookSuburl = `${repoName}/${notebookPath}`;

  const gitpullNext =
    `/hub/user-redirect/git-pull` +
    `?repo=${gitRepoUrl}` +
    `&branch=${branch}` +
    `&urlpath=lab/tree/${notebookSuburl}`;

  const spawnNext = "/hub/spawn?next=" + quoteAll(gitpullNext);

  const configMatch = permalink.match(/%23.+?(?=%7D)/);
  if (!configMatch) {
    throw new Error(
      "Permalink does not contain a fancy-forms-config fragment (looking for '%23...%7D')."
    );
  }
  const fancyFormsConfig = configMatch[0].replaceAll(
    "%22autoStart%22%3A%22false%22",
    "%22autoStart%22%3A%22true%22"
  );

  const jupyterhubUrl = new URL(permalink).origin;

  return (
    `${jupyterhubUrl}/hub/login` +
    `?next=${quoteAll(spawnNext)}` +
    `${fancyFormsConfig}%7D`
  );
}
