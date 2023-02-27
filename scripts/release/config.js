const EnvName = {
  DEV: "dev",
  STAGING: "staging",
  PROD: "prod",
};
const BranchName = {
  DEVELOP: "develop",
  MASTER: "production",
  STAGING: "staging",
};

const mapBranchsEnvironments = new Map()
  .set(EnvName.DEV, BranchName.DEVELOP)
  .set(EnvName.STAGING, BranchName.MASTER)
  .set(EnvName.STAGING, BranchName.MASTER);

module.exports = {
  EnvName,
  BranchName,
  mapBranchsEnvironments,
};
