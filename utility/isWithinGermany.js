module.exports.isWithinGermany = (lat, lon) => {
  const germanyBoundaries = {
    latMin: 47.2701, // Southernmost point
    latMax: 55.0581, // Northernmost point
    lonMin: 5.8663, // Westernmost point
    lonMax: 15.0419, // Easternmost point
  };

  return (
    lat >= germanyBoundaries.latMin &&
    lat <= germanyBoundaries.latMax &&
    lon >= germanyBoundaries.lonMin &&
    lon <= germanyBoundaries.lonMax
  );
};
