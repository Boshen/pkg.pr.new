import { defineCommand, runMain } from "citty";
import path from "path";
import ezSpawn from "@jsdevtools/ez-spawn";
// import { createRequire } from "module";
import { version } from "./package.json";
import { hash, objectHash, sha256 } from "ohash";
import fs from "fs/promises";
import { Octokit } from "@octokit/action";
import "./environments";

const {
  default: { name, version },
} = await import(path.resolve(process.cwd(), "package.json"), {
  with: { type: "json" },
});
console.log(name, version);

declare global {
  var API_URL: string;
}

const publishUrl = new URL("/publish", API_URL);

if (!process.env.TEST && process.env.GITHUB_ACTIONS !== "true") {
  console.error(
    "Stackblitz Continuous Releases are only available in Github Actions."
  );
  process.exit(1);
}

const {
  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GITHUB_RUN_ATTEMPT,
  GITHUB_ACTOR_ID,
} = process.env;

// Note: If you need to use a workflow run's URL from within a job, you can combine these variables: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID
const url = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;

const metadata = {
  url,
  attempt: Number(GITHUB_RUN_ATTEMPT),
  actor: Number(GITHUB_ACTOR_ID),
};

const key = hash(metadata);
console.log('publish cli', metadata, key)

const main = defineCommand({
  meta: {
    version,
    name: "stackblitz",
    description: "A CLI for Stackblitz CR (Continuous Releases)",
  },
  subCommands: {
    publish: () => {
      return {
        meta: {},
        run: async () => {
          await ezSpawn.async("npm pack", { stdio: "inherit" });
          const file = await fs.readFile(`${name}-${version}.tgz`);
          console.log(file);

          await fetch(publishUrl, {
            method: "POST",
            headers: {
              "sb-key": key,
              "sb-package-name": name,
              "sb-package-version": version,
            },
            body: file,
          });
        },
      };
    },
    link: () => {
      return {
        meta: {},
        run: () => {},
      };
    },
  },
});

runMain(main);
