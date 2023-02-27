const branch_name = require("current-git-branch");
const chalk = require("chalk");
const inquirer = require("inquirer");
const log = console.log;
const { initRelease } = require("./release");
const { execSync } = require("child_process");
const { BranchName } = require("./config");

const init = () => {
  logStart();

  const ACTIONS = {
    RELEASE_DISTRIBUTE: "Release and Distribute",
    DISTRIBUTE: "Distribute",
  };

  const currentBranch = branch_name();

  if (currentBranch !== BranchName.MASTER) {
    inquirer
      .prompt({
        type: "list",
        name: "action",
        message: "Let's start! What you want to do?",
        choices: currentBranch === 'staging' ? [ACTIONS.RELEASE_DISTRIBUTE, ACTIONS.DISTRIBUTE] : [ACTIONS.DISTRIBUTE],
      })
      .then(({ action }) => {
        inquirer
          .prompt({
            type: "confirm",
            name: "confirmed",
            message: `You are currently on ${chalk.bold.green(
              currentBranch
            )} branch. Are you sure you want to ${action} it?`,
            choices: [
              { name: "Yes", value: true },
              { name: "No", value: false },
            ],
          })
          .then(async ({ confirmed }) => {
            if (confirmed) {
              switch (action) {
                case ACTIONS.RELEASE_DISTRIBUTE:
                  initRelease(currentBranch);
                  break;
                case ACTIONS.DISTRIBUTE:
                  initDistribute(currentBranch);

                  break;
                default:
                  process.exit(0);
              }
            }
          });
      });
  } else {
    initDistribute(currentBranch);
  }
};

const initDistribute = (currentBranch) => {
  const version = require("../package.json").version;
  try {
    execSync(`node ./scripts/distribute ${version}  ${currentBranch}`, {
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
