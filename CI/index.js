const chalk = require("chalk");
const log = console.log;
// const { initRelease } = require("./release");
const { execSync } = require("child_process");
const { BranchName } = require("./config");
// const { BranchName } = require("./config");

const init = () => {
  logStart();

  const [envConfig, branch] = process.argv.splice(2);

  switch (branch) {
    case BranchName.DEVELOP:
    case BranchName.PRE_PRODUCTION:
    case BranchName.PRODUCTION:
      execDistribution(envConfig, branch);
      break;
    case BranchName.STAGING:

    default:
      break;
  }
};

const execDistribution = (configEnv, branch) => {

  const version = require("../package.json").version;
  try {
    execSync(`node ./scripts/distribute ${version}  ${configEnv}  ${branch}`, {
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
  log(chalk.bold("###\t\t\t Adsp CII \t\t\t\t\t###"));
  log("###\t\t\t\t\t\t\t\t\t###");
  log(
    "###########################################################################"
  );
  log(
    "###########################################################################\n"
  );
};

init();
