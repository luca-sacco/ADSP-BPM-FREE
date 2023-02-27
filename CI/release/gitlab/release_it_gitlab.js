const _ = require("lodash");
const fs = require("fs");
const path = require("path");
const globby = require("globby");
const got = require("got");
const FormData = require("form-data");

require("dotenv").config();

const { format, parseGitUrl, e } = require("release-it/lib/util");
const prompts = require("release-it/lib/plugin/gitlab/prompts");

const allSettled = require("promise.allsettled");

const docs = "https://git.io/release-it-gitlab";

const { Plugin } = require("release-it");
const { request } = require("https");

const noop = Promise.resolve();
const options = { write: false };
const changelogFallback = 'git log --pretty=format:"* %s (%h)"';

class CustomGitLab extends Plugin {
  constructor(...args) {
    super(...args);
    // dal GitRelease
    this.registerPrompts(prompts);
    // this.type = "GitLab";
    this.assets = [];
    // dal GitRelease
    const { certificateAuthorityFile } = this.options;
    this.certificateAuthorityOption = certificateAuthorityFile
      ? {
        https: {
          certificateAuthority: fs.readFileSync(certificateAuthorityFile),
        },
      }
      : {};
  }

  // dal GitRelease
  static isEnabled(options) {
    return options.release;
  }

  get client() {
    if (this._client) {
      return this._client
    };
    const { tokenHeader } = this.options;
    const { baseUrl } = this.getContext();
    this._client = got.extend({
      baseUrl,
      method: "POST",
      headers: {
        "user-agent": "webpro/release-it",
        [tokenHeader]: this.token,
      },
      ...this.certificateAuthorityOption,
    });
    return this._client;
  }

  // dal GitRelease
  getInitialOptions(options) {
    const baseOptions = super.getInitialOptions(...arguments);
    const git = options.git || defaultConfig.git;
    const gitOptions = _.pick(git, [
      "tagName",
      "tagMatch",
      "pushRepo",
      "changelog",
    ]);
    return _.defaults(baseOptions, gitOptions);
  }

  // getInitialOptions(options, namespace) {
  //   return Object.assign({}, options[namespace], {
  //     isUpdate: options.isUpdate,
  //   });
  // }

  get token() {
    const { tokenRef } = this.options;
    return _.get(process.env, tokenRef, null);
  }

  get hostname() {
    return this.options.hostname;
  }

  get path() {
    return this.options.path;
  }

  get releaseUrl() {
    return this.options.releaseUrl;
  }

  get projectID() {
    return this.options.projectID;
  }

  // async base_init() {
  //   await this.fetch();
  //   const latestTagName = await this.getLatestTagName();
  //   const secondLatestTagName = this.options.isUpdate
  //     ? await this.getSecondLatestTagName()
  //     : null;
  //   const tagTemplate =
  //     this.options.tagName ||
  //     ((latestTagName || "").match(/^v/) ? "v${version}" : "${version}");
  //   this.setContext({ tagTemplate, latestTagName, secondLatestTagName });
  //   this.config.setContext({ latestTag: latestTagName });
  // }

  async init() {
    await this.base_git_init();

    const { skipChecks, tokenRef, tokenHeader } = this.options;
    const { repo } = this.getContext();
    const hasJobToken = (tokenHeader || "").toLowerCase() === "job-token";
    const origin = this.options.origin || `https://${repo.host}`;
    this.setContext({
      // id: encodeURIComponent(repo.repository),
      id: this.projectID,
      origin,
      baseUrl: `${origin}/api/v4`,
    });

    if (skipChecks) return;

    if (!this.token) {
      throw e(
        `Environment variable "${tokenRef}" is required for GitLab releases.`,
        docs
      );
    }

    if (!hasJobToken) {
      if (!(await this.isAuthenticated())) {
        throw e(
          `Could not authenticate with GitLab using environment variable "${tokenRef}".`,
          docs
        );
      }
      // if (!(await this.isCollaborator())) {
      //   const { user, repo } = this.getContext();
      //   throw e(
      //     `User ${user.username} is not a collaborator for ${repo.repository}.`,
      //     docs
      //   );
      // }
    }
  }

  getName() {
    return this.getContext("repo.project");
  }

  getLatestVersion() {
    const { tagTemplate, latestTag } = this.config.getContext();
    const prefix = tagTemplate.replace(/\$\{version\}/, "");
    return latestTag ? latestTag.replace(prefix, "").replace(/^v/, "") : null;
  }

  async getChangelog() {
    const { latestTag, secondLatestTag } = this.config.getContext();
    const context = { latestTag, from: latestTag, to: "HEAD" };
    const { changelog } = this.options;
    if (!changelog) return null;

    if (latestTag && !this.config.isIncrement) {
      context.from = secondLatestTag;
      context.to = `${latestTag}^1`;
    }

    if (!context.from && changelog.includes("${from}")) {
      return this.exec(changelogFallback);
    }

    return this.exec(changelog, { context, options });
  }

  bump(version) {
    const { tagTemplate } = this.config.getContext();
    const context = Object.assign(this.config.getContext(), { version });
    const tagName = format(tagTemplate, context) || version;
    this.setContext({ version });
    this.config.setContext({ tagName });
  }

  async base_git_init() {
    this.remoteUrl = await this.getRemoteUrl();
    await this.fetch();
    const repo = parseGitUrl(this.remoteUrl);
    const latestTag = await this.getLatestTagName(repo);
    const secondLatestTag = !this.config.isIncrement
      ? await this.getSecondLatestTagName(latestTag)
      : null;
    const tagTemplate =
      this.options.tagName ||
      ((latestTag || "").match(/^v/) ? "v${version}" : "${version}");
    this.setContext({ repo });
    this.config.setContext({ tagTemplate, latestTag, secondLatestTag });
  }

  async beforeRelease() {
    await this.base_beforeRelease();
    await this.checkReleaseMilestones();
  }

  async release() {
    const glRelease = () => this.createRelease();
    const glUploadAssets = () => this.uploadAssets();

    if (this.config.isCI) {
      await this.step({
        enabled: this.options.assets,
        task: glUploadAssets,
        label: "GitLab upload assets",
      });
      return await this.step({ task: glRelease, label: "GitLab release" });
    } else {
      const release = () => glUploadAssets().then(() => glRelease());
      return await this.step({
        task: release,
        label: "GitLab release",
        prompt: "release",
      });
    }
  }

  async createRelease() {
    const { releaseName } = this.options;
    const { tagName } = this.config.getContext();
    const { id, releaseNotes, repo, origin } = this.getContext();
    const { isDryRun } = this.config;
    const name = format(releaseName, this.config.getContext());
    const description = releaseNotes || "-";
    // to change with new
    const repository = repo.repository.replace('gitlab/', '');
    const releaseUrl = `${origin}/${repository}/-/releases`;
    const releaseMilestones = this.getReleaseMilestones();
    this.log.exec(`gitlab releases#createRelease "${name}" (${tagName})`, {
      isDryRun,
    });

    if (isDryRun) {
      this.setContext({ isReleased: true, releaseUrl });
      return true;
    }

    const endpoint = `projects/${id}/releases`;
    const options = {
      json: true,
      body: {
        name,
        tag_name: tagName,
        description,
      },
    };

    if (this.assets.length) {
      options.body.assets = {
        links: this.assets,
      };
    }

    if (releaseMilestones.length) {
      options.body.milestones = releaseMilestones;
    }

    try {
      await this.request(endpoint, options);
      this.log.verbose("gitlab releases#createRelease: done");
      this.setContext({ isReleased: true, releaseUrl });
      return true;
    } catch (err) {
      this.debug(err);
      throw err;
    }
  }

  async uploadAsset(filePath) {
    const name = path.basename(filePath);
    const { id, origin, repo } = this.getContext();
    const endpoint = `projects/${id}/uploads`;

    const body = new FormData();
    body.append("file", fs.createReadStream(filePath));
    const options = { body };

    try {
      const body = await this.request(endpoint, options);
      this.log.verbose(`gitlab releases#uploadAsset: done (${body.url})`);
      this.assets.push({
        name,
        url: `${origin}/${repo.repository}${body.url}`,
      });
    } catch (err) {
      this.debug(err);
      throw err;
    }
  }

  uploadAssets() {
    const { assets } = this.options;
    const { isDryRun } = this.config;
    const context = this.config.getContext();

    this.log.exec("gitlab releases#uploadAssets", assets, { isDryRun });

    if (!assets || isDryRun) {
      return noop;
    }

    const patterns = _.castArray(assets).map((pattern) =>
      format(pattern, context)
    );

    return globby(patterns).then((files) => {
      if (!files.length) {
        this.log.warn(
          `gitlab releases#uploadAssets: could not find "${assets}" relative to ${process.cwd()}`
        );
      }
      return Promise.all(files.map((filePath) => this.uploadAsset(filePath)));
    });
  }

  async base_beforeRelease() {
    const { releaseNotes: script } = this.options;
    const { changelog } = this.config.getContext();
    const releaseNotes = script ? await this.exec(script) : changelog;
    this.setContext({ releaseNotes });
    if (releaseNotes !== changelog) {
      this.log.preview({ title: "release notes", text: releaseNotes });
    }
  }

  afterRelease() {
    const { isReleased, releaseUrl } = this.getContext();
    if (isReleased) {
      this.log.log(`🔗 ${releaseUrl}`);
    }
  }

  async checkReleaseMilestones() {
    if (this.options.skipChecks) return;

    const releaseMilestones = this.getReleaseMilestones();
    if (releaseMilestones.length < 1) {
      return;
    }

    this.log.exec(`gitlab releases#checkReleaseMilestones`);

    const { id } = this.getContext();
    const endpoint = `projects/${id}/milestones`;
    const requests = releaseMilestones.map((milestone) => {
      const options = {
        method: "GET",
        query: {
          title: milestone,
          include_parent_milestones: true,
        },
      };
      return this.request(endpoint, options).then((response) => {
        if (!Array.isArray(response)) {
          const { baseUrl } = this.getContext();
          throw new Error(
            `Unexpected response from ${baseUrl}/${endpoint}. Expected an array but got: ${JSON.stringify(
              response
            )}`
          );
        }
        if (response.length === 0) {
          const error = new Error(`Milestone '${milestone}' does not exist.`);
          this.log.warn(error.message);
          throw error;
        }
        this.log.verbose(
          `gitlab releases#checkReleaseMilestones: milestone '${milestone}' exists`
        );
      });
    });
    try {
      await allSettled(requests).then((results) => {
        for (const result of results) {
          if (result.status === "rejected") {
            throw e(
              "Missing one or more milestones in GitLab. Creating a GitLab release will fail.",
              docs
            );
          }
        }
      });
    } catch (err) {
      this.debug(err);
      throw err;
    }
    this.log.verbose("gitlab releases#checkReleaseMilestones: done");
  }

  getReleaseMilestones() {
    const { milestones } = this.options;
    return (milestones || []).map((milestone) =>
      format(milestone, this.config.getContext())
    );
  }

  async isAuthenticated() {
    if (this.config.isDryRun) return true;
    const endpoint = `user`;
    try {
      const { id, username } = await this.request(endpoint, { method: "GET" });
      this.setContext({ user: { id, username } });
      return true;
    } catch (err) {
      this.debug(err);
      return false;
    }
  }

  async request(endpoint, options) {
    const { baseUrl } = this.getContext();
    this.debug(Object.assign({ url: `${baseUrl}/${endpoint}` }, options));
    const method = (options.method || "POST").toLowerCase();
    const response = await this.client[method](endpoint, options);
    const body =
      typeof response.body === "string"
        ? JSON.parse(response.body)
        : response.body || {};
    this.debug(body);
    return body;
  }

  // async init() {
  //   if (!this.token) {
  //     throw new e(this.type, this.options.tokenRef);
  //   }
  // }

  // async getChangelog() {
  //   const { isUpdate, latestTagName, secondLatestTagName } = this.getContext();
  //   const context = {
  //     latestTag: latestTagName,
  //     from: latestTagName,
  //     to: "HEAD",
  //   };
  //   const { changelog } = this.options;
  //   if (!changelog) return null;

  //   if (latestTagName && isUpdate) {
  //     context.from = secondLatestTagName;
  //     context.to = `${latestTagName}^1`;
  //   }

  //   if (!context.from && changelog.includes("${from}")) {
  //     return this.exec(changelogFallback);
  //   }

  //   return this.exec(changelog, { context, options });
  // }

  // async beforeRelease() {
  //   const { releaseNotes: script } = this.options;
  //   const { changelog } = this.config.getContext();
  //   const releaseNotes = script ? await this.exec(script) : changelog;
  //   this.setContext({ releaseNotes });
  //   if (releaseNotes !== changelog) {
  //     this.log.preview({ title: "release notes", text: releaseNotes });
  //   }
  // }

  // bump(version) {
  //   const { tagTemplate } = this.getContext();
  //   const tagName = format(tagTemplate, { version }) || version;
  //   this.setContext({ version, tagName });
  //   this.config.setContext({ tagName });
  // }

  // afterRelease() {
  //   const { isReleased } = this.getContext();
  //   if (isReleased) {
  //     this.log.log(`🔗 ${this.releaseUrl}`);
  //   }
  // }

  // async release() {
  //   const glRelease = () => this.createRelease();
  //   const glUploadAssets = () => this.uploadAssets();

  //   if (this.config.isCI) {
  //     await this.step({
  //       enabled: this.options.assets,
  //       task: glUploadAssets,
  //       label: "GitLab upload assets",
  //     });
  //     return await this.step({ task: glRelease, label: "GitLab release" });
  //   } else {
  //     // const release = () => glUploadAssets().then(() => glRelease());
  //     return await this.step({
  //       task: glRelease,
  //       label: "GitLab release",
  //       prompt: "release",
  //     });
  //   }
  // }

  // async httpRequest(releaseOptions) {
  //   return new Promise((resolve, reject) => {
  //     const options = {
  //       method: "POST",
  //       hostname: this.hostname,
  //       path: this.path,
  //       headers: {
  //         "PRIVATE-TOKEN": this.token,
  //         "Content-Type": "application/json",
  //       },
  //     };
  //     this.debug(options);
  //     const req = request(options, (res) => {
  //       const chunks = [];

  //       res.on("error", (error) => {
  //         this.debug(error);
  //         reject(error);
  //       });

  //       res.on("data", (chunk) => {
  //         chunks.push(chunk);
  //       });

  //       res.on("end", () => {
  //         try {
  //           const body = Buffer.concat(chunks);
  //           const jsonResponse = JSON.parse(body.toString());
  //           if (
  //             jsonResponse.tag_name &&
  //             jsonResponse.name &&
  //             jsonResponse.created_at
  //           ) {
  //             resolve({ body: jsonResponse });
  //           } else {
  //             this.debug(jsonResponse.error);
  //             reject(jsonResponse.error);
  //           }
  //         } catch (e) {
  //           reject(e);
  //           this.debug(e);
  //         }
  //       });
  //     });
  //     req.write(JSON.stringify(releaseOptions));
  //     req.end();
  //   });
  // }

  // async request(options) {
  //   this.debug(
  //     Object.assign({ url: `${this.hostname}/${this.path}` }, options)
  //   );

  //   const response = await this.httpRequest(options);

  //   const body =
  //     typeof response.body === "string"
  //       ? JSON.parse(response.body)
  //       : response.body || {};
  //   this.debug(body);
  //   return body;
  // }

  // async createRelease() {
  //   const { releaseName } = this.options;
  //   const { tagName, releaseNotes } = this.getContext();
  //   const { isDryRun } = this.config;
  //   const name = format(releaseName, this.config.getContext());
  //   const description = releaseNotes || "-";

  //   this.log.exec(`gitlab releases#createRelease "${name}" (${tagName})`, {
  //     isDryRun,
  //   });

  //   if (isDryRun) {
  //     this.setContext({ isReleased: true });
  //     return true;
  //   }

  //   const options = {
  //     name,
  //     tag_name: tagName,
  //     description,
  //   };

  //   if (this.assets.length) {
  //     options.assets = {
  //       links: this.assets,
  //     };
  //   }

  //   try {
  //     await this.request(options);
  //     this.log.verbose("gitlab releases#createRelease: done");
  //     this.setContext({ isReleased: true });
  //     return true;
  //   } catch (err) {
  //     this.debug(err);
  //     throw err;
  //   }
  // }

  // async uploadAsset(filePath) {
  //   const name = path.basename(filePath);
  //   const { repository } = this.getContext("repo");
  //   const endpoint = `projects/${this.id}/uploads`;

  //   const body = new FormData();
  //   body.append("file", fs.createReadStream(filePath));
  //   const options = { body };

  //   try {
  //     const body = await this.request(endpoint, options);
  //     this.log.verbose(`gitlab releases#uploadAsset: done (${body.url})`);
  //     this.assets.push({
  //       name,
  //       url: `${this.origin}/${repository}${body.url}`,
  //     });
  //   } catch (err) {
  //     this.debug(err);
  //     throw err;
  //   }
  // }

  // uploadAssets() {
  //   const { assets } = this.options;
  //   const { isDryRun } = this.config;

  //   this.log.exec("gitlab releases#uploadAssets", assets, { isDryRun });

  //   if (!assets || isDryRun) {
  //     return noop;
  //   }

  //   return globby(assets).then((files) => {
  //     if (!files.length) {
  //       this.log.warn(
  //         `gitlab releases#uploadAssets: could not find "${assets}" relative to ${process.cwd()}`
  //       );
  //     }
  //     return Promise.all(files.map((filePath) => this.uploadAsset(filePath)));
  //   });
  // }

  // fetch() {
  //   return this.exec("git fetch").catch((err) => {
  //     this.debug(err);
  //     throw new e(err, this.remoteUrl);
  //   });
  // }

  // getLatestTagName() {
  //   return this.exec("git describe --tags --abbrev=0", { options }).then(
  //     (stdout) => stdout || null,
  //     () => null
  //   );
  // }

  // async getSecondLatestTagName() {
  //   const sha = await this.exec("git rev-list --tags --skip=1 --max-count=1", {
  //     options,
  //   });
  //   return this.exec(`git describe --tags --abbrev=0 ${sha}`, {
  //     options,
  //   }).catch(() => null);
  // }

  fetch() {
    return this.exec("git fetch").catch((err) => {
      this.debug(err);
      throw new Error(
        `Unable to fetch from ${this.remoteUrl}${EOL}${err.message}`
      );
    });
  }

  async getSecondLatestTagName(latestTag) {
    const sha = await this.exec(
      `git rev-list ${latestTag || "--skip=1"} --tags --max-count=1`,
      {
        options,
      }
    );
    return this.exec(`git describe --tags --abbrev=0 "${sha}^"`, {
      options,
    }).catch(() => null);
  }

  getLatestTagName(repo) {
    const context = Object.assign({ repo }, this.getContext(), {
      version: "*",
    });
    const match = format(
      this.options.tagMatch || this.options.tagName || "${version}",
      context
    );
    return this.exec(`git describe --tags --match=${match} --abbrev=0`, {
      options,
    }).then(
      (stdout) => stdout || null,
      () => null
    );
  }

  async getRemoteUrl() {
    const remoteNameOrUrl =
      this.options.pushRepo || (await this.getRemote()) || "origin";
    return this.isRemoteName(remoteNameOrUrl)
      ? this.exec(`git remote get-url ${remoteNameOrUrl}`, { options }).catch(
        () =>
          this.exec(`git config --get remote.${remoteNameOrUrl}.url`, {
            options,
          }).catch(() => null)
      )
      : remoteNameOrUrl;
  }

  async getRemote() {
    const branchName = await this.getBranchName();
    return branchName ? await this.getRemoteForBranch(branchName) : null;
  }

  getBranchName() {
    return this.exec("git rev-parse --abbrev-ref HEAD", { options }).catch(
      () => null
    );
  }

  getRemoteForBranch(branch) {
    return this.exec(`git config --get branch.${branch}.remote`, {
      options,
    }).catch(() => null);
  }

  isRemoteName(remoteUrlOrName) {
    return remoteUrlOrName && !remoteUrlOrName.includes("/");
  }
}

module.exports = CustomGitLab;
