import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeLink } from "./linkmaker.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(here, "fixtures.json"), "utf8")
);

for (const fx of fixtures) {
  test(`fixture: ${fx.label} matches Python output byte-for-byte`, () => {
    assert.equal(makeLink(fx.notebookUrl, fx.permalink), fx.expected);
  });
}

test("autoStart=false in permalink is flipped to true in output", () => {
  const fx = fixtures.find((f) => f.label === "autostart_false_gets_flipped");
  const out = makeLink(fx.notebookUrl, fx.permalink);
  assert.ok(
    out.includes("%22autoStart%22%3A%22true%22"),
    "expected autoStart=true in output"
  );
  assert.ok(
    !out.includes("%22autoStart%22%3A%22false%22"),
    "expected no autoStart=false in output"
  );
});

test("derives jupyterhub origin from permalink", () => {
  const out = makeLink(
    "https://github.com/owner/repo/blob/main/nb.ipynb",
    "https://example.hub.test/hub/login?next=/hub/spawn%23fancy-forms-config=%7B%22autoStart%22%3A%22true%22%7D"
  );
  assert.ok(out.startsWith("https://example.hub.test/hub/login?next="));
});

test("throws when notebook URL is not a GitHub blob URL", () => {
  assert.throws(
    () =>
      makeLink(
        "https://github.com/owner/repo",
        "https://x.test/hub/login?next=/hub/spawn%23fancy-forms-config=%7B%22a%22%3A%22b%22%7D"
      ),
    /GitHub blob URL/
  );
});

test("throws when permalink has no fancy-forms-config fragment", () => {
  assert.throws(
    () =>
      makeLink(
        "https://github.com/owner/repo/blob/main/nb.ipynb",
        "https://x.test/hub/login?next=/hub/spawn"
      ),
    /fancy-forms-config/
  );
});

test("encodes characters that encodeURIComponent leaves alone (! * ' ( ))", () => {
  // Branch with these characters exercises quoteAll's extra encoding.
  const out = makeLink(
    "https://github.com/owner/repo/blob/feat(x)!/nb.ipynb",
    "https://x.test/hub/login?next=/hub/spawn%23fancy-forms-config=%7B%22autoStart%22%3A%22true%22%7D"
  );
  // The branch "feat(x)!" appears inside the doubly-encoded gitpull URL.
  // ( → %2528, ) → %2529, ! → %2521 after double-encoding.
  assert.ok(out.includes("feat%2528x%2529%2521"), `unexpected output: ${out}`);
});
