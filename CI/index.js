const chalk = require("chalk");
const log = console.log;
// const { initRelease } = require("./release");
const { execSync } = require("child_process");
const { BranchName } = require("./config");
// const { BranchName } = require("./config");

const init = () => {
  logStart();

  const [configFilePath, branch] = process.argv.splice(2);

  switch (branch) {
    case BranchName.DEVELOP:
    case BranchName.PRE_PRODUCTION:
    case BranchName.PRODUCTION:
      execDistribution(configFilePath, branch);
      break;
    case BranchName.STAGING:

    default:
      break;
  }
};

const execDistribution = (configFilePath, branch) => {

  const version = require("../package.json").version;
  try {
    execSync(`node ./CI/distribute ${version}  ${configFilePath}  ${branch}`, {
      stdio: "inherit",
    });
  } catch (err) {
    process.exit(1);
  }
};

const logStart = () => {
  log(
    "\n###########################################################################"
  );
  log(
    "###########################################################################"
  );
  log("###\t\t\t\t\t\t\t\t\t###");
  log(chalk.bold("###\t\t\t Adsp BPM \t\t\t\t\t###"));
  log("###\t\t\t\t\t\t\t\t\t###");
  log(
    "###########################################################################"
  );
  log(
    "###########################################################################\n"
  );
};

init();
