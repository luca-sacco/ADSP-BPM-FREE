const execSync = require("child_process");

const exec = (args, opts) => {
  execSync(args.join(" "), {
    stdio: "inherit",
    ...opts,
  });
};

module.exports = {
  exec,
};
