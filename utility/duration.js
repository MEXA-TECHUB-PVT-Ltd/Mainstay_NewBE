exports.calculateRemainingDays = (deletedAt) => {
  const deletionTimestamp = new Date(deletedAt).getTime();
  const nowTimestamp = Date.now();
  const remainingMilliseconds =
    deletionTimestamp + 90 * 24 * 60 * 60 * 1000 - nowTimestamp;

  return Math.ceil(remainingMilliseconds / (24 * 60 * 60 * 1000));
};
