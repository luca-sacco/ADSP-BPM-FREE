const chalk = require("chalk");
const shell = require("shelljs");
const pkgJson = require("../../package.json");
const Ora = require("ora");
const path = require("path");
const SftpUpload = require("sftp-upload");
const Client = require("ssh2-sftp-client");

const spinner = Ora();

const log = console.log;

const initDistribution = async () => {
  const [version, configEnv, branch] = process.argv.splice(2);

  log(
    chalk.bold(
      `\n-------- Starting distribution of v${version} on ${branch} enviroment -------- \n`
    )
  );

  const newConfig = configEnv.replace(/\//g, '');

  console.log('newCongi!!', newConfig);
  console.log(JSON.parse(newConfig));

  try {
    const config = require(`./environments/distribute.${branch}.json`);
    const { name } = require("../../package.json");

    config.buildsDir = config.buildsDir.replace("{micro-fe}", name);

    config.remote.deploy.angularDestinationPath =
      config.remote.deploy.angularDestinationPath
        .replace("{version}", version)
        .replace("{micro-fe}", name);

    await build(version);
    await deploy(config);
    updateImportMap(config, version, name);
  } catch (err) {
    log(chalk.red("\n", err));
    process.exit(1);
  }
};

const build = async (version) => {
  const npmBuildScript = pkgJson.scripts["build:staging"];

  const versionedNpmBuildScript = npmBuildScript.replace("${version}", version);

  spinner.start(`Running command: ${versionedNpmBuildScript}`);

  return new Promise((resolve, reject) => {
    shell.exec(
      versionedNpmBuildScript,
      { silent: true },
      (code, stdout, stderr) => {
        if (code != 0) {
          return reject(new Error(stderr));
        }
        spinner.succeed("Build completed");
        return resolve(stdout);
      }
    );
  });
};

const deploy = (config) => {
  const {
    remote: { deploy },
  } = config;

  spinner.start(`Deploying application`);

  return new Promise((resolve, reject) => {
    const sftp = new SftpUpload({
      username: deploy.user,
      password: deploy.password,
      host: deploy.host,
      port: deploy.port,
      privateKey: deploy.privateKey ? fs.readFileSync(deploy.privateKey) : null,
      path: config.buildsDir,
      remoteDir: deploy.angularDestinationPath,
    });

    sftp
      .on("error", function (err) {
        err = `SFTP deploy error: ${err}`;
        spinner.fail(err);
        throw new Error(err);
      })
      .on("uploading", function (progress) {
        process.stdout.write(`  ${progress.percent}%: ${progress.file}\r`);
      })
      .on("completed", function () {
        spinner.succeed("SFTP deploy completed");
        spinner.stop();
        resolve();
      })
      .upload();
  });
};

const updateImportMap = (config, version, name) => {
  spinner.start("Updating import-map-json");

  const {
    remote: { deploy },
  } = config;

  const sftp = new Client();

  sftp
    .connect({
      host: deploy.host,
      port: deploy.port,
      username: deploy.user,
      password: deploy.password,
    })
    .then(() => {
      return sftp.get(deploy.importMapPath);
    })
    .then((importMapJsonBuffer) => {
      const importMapJson = JSON.parse(importMapJsonBuffer.toString());
      importMapJson.imports[name] = importMapJson.imports[name].replace(
        /(\d+\.)?(\d+\.)?(\*|\d+)/,
        version
      );
      const buffer = Buffer.from(JSON.stringify(importMapJson));
      return sftp.put(buffer, deploy.importMapPath);
    })
    .then(() => {
      spinner.succeed(`Import map updated`);
      spinner.stop();
      sftp.end();
    })
    .catch((err) => {
      spinner.fail(err.message);
      sftp.end();
    });
};

const main = () => {
  initDistribution();
};

main();
