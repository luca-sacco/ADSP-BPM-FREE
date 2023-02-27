const release = require("release-it");
const chalk = require("chalk");
const boxen = require("boxen");
const inquirer = require("inquirer");
const { BranchName } = require("../config");

const log = console.log;

const initRelease = (branch) => {
  log(chalk.bold("\n ---- Starting release process ---- \n"));

  const releaseItConfig = getRealaseConfig(branch);

  release(releaseItConfig).then(
    (output) => {
      // console.log(output);
    },
    (err) => {}
  );
};

const getRealaseConfig = (branch) => {
  const releaseItJson = require("./release-it.json");
  releaseItJson.hooks = Object.assign({}, releaseItJson.hooks, {
    "after:bump": _getDistributeCmd(branch),
  });
  releaseItJson.ci = true;

  return releaseItJson;
};

const _getDistributeCmd = (branch) => {
  return ["node ./scripts/distribute", "${version}", `${branch}`].join(" ");
};

module.exports = {
  initRelease,
};
