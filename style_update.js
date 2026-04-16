const fs = require('fs');

const style = JSON.parse(fs.readFileSync('style.json', 'utf8'));

// Delete the grey gebco visual overlay
delete style.sources['gebco-bathymetry'];
const index = style.layers.findIndex(l => l.id === 'gebco-layer');
if (index > -1) {
    style.layers.splice(index, 1);
}

// Add the ocean geojson from tellingtales
style.sources['ocean'] = {
  "type": "geojson",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [
            [
              [-180, -90],
              [-180, 90],
              [180, 90],
              [180, -90],
              [-180, -90]
            ]
          ]
        }
      }
    ]
  }
};

// Wait, the tellingtales ocean polygon is just a bounding box of the whole world! 
// Let's verify that. If it's the whole world, then adding a blue fill to it will wash out the land too.
