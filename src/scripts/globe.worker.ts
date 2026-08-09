type RenderMessage = {
  type: 'render';
  columns: number;
  rows: number;
  phase: number;
  article: boolean;
};

type GeoPoint = readonly [longitude: number, latitude: number];

type SurfaceLayer = 'coast' | 'land' | 'ocean';

type RenderedGlobe = {
  coast: string;
  composite: string;
  land: string;
  ocean: string;
};

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Deliberately simplified coastlines: enough vertices to keep the continents
// recognisable at terminal resolution without shipping a large map dataset.
const LANDMASSES: readonly (readonly GeoPoint[])[] = [
  // Alaska and the Aleutian shoulder.
  [[-179, 52], [-170, 58], [-166, 67], [-151, 72], [-137, 69], [-130, 60], [-145, 56], [-160, 55]],
  // North America.
  [[-141, 70], [-116, 72], [-95, 68], [-78, 63], [-60, 54], [-66, 45], [-76, 36], [-82, 25], [-90, 19], [-100, 20], [-108, 25], [-117, 32], [-125, 43], [-123, 53], [-133, 59]],
  // Central America.
  [[-101, 23], [-90, 20], [-86, 15], [-78, 9], [-77, 5], [-83, 7], [-88, 13], [-96, 16]],
  // South America.
  [[-81, 12], [-69, 13], [-51, 7], [-35, -5], [-39, -21], [-48, -28], [-53, -45], [-66, -56], [-73, -51], [-76, -30], [-81, -8]],
  // Greenland.
  [[-73, 59], [-58, 60], [-42, 68], [-20, 75], [-24, 82], [-48, 84], [-65, 78]],
  // Europe.
  [[-11, 36], [-10, 44], [-5, 49], [-10, 58], [-2, 61], [8, 58], [13, 64], [25, 71], [38, 69], [40, 57], [31, 46], [25, 39], [14, 36], [3, 38]],
  // Africa.
  [[-17, 36], [5, 37], [17, 33], [32, 31], [43, 12], [51, 10], [43, -13], [33, -35], [18, -35], [8, -21], [-1, 5], [-14, 14]],
  // Asia.
  [[26, 39], [36, 55], [47, 66], [70, 75], [103, 77], [136, 72], [178, 64], [166, 52], [146, 48], [140, 37], [126, 31], [120, 20], [108, 8], [99, 10], [92, 22], [82, 8], [72, 20], [60, 25], [51, 38], [42, 43]],
  // India.
  [[66, 26], [78, 30], [91, 25], [88, 18], [79, 7], [72, 9]],
  // Mainland and island South-East Asia.
  [[94, 23], [108, 21], [121, 13], [126, 2], [119, -8], [111, 1], [103, 8]],
  [[95, 5], [106, 3], [111, -7], [102, -8]],
  [[113, 1], [121, 0], [119, -9], [113, -8]],
  [[128, 2], [142, -3], [141, -9], [130, -8]],
  // Japan and the British Isles remain visible in the larger article globe.
  [[129, 31], [136, 35], [143, 44], [146, 42], [140, 34], [133, 30]],
  [[-10, 50], [-5, 58], [1, 55], [-2, 50]],
  // Australia, New Zealand, Madagascar.
  [[112, -11], [130, -10], [146, -18], [153, -28], [145, -39], [129, -35], [114, -25]],
  [[166, -35], [178, -38], [176, -47], [168, -45]],
  [[47, -13], [51, -18], [49, -27], [44, -24]],
];

function normaliseLongitude(longitude: number): number {
  return ((longitude + 540) % 360) - 180;
}

function pointInPolygon(longitude: number, latitude: number, polygon: readonly GeoPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const [currentLongitude, currentLatitude] = polygon[index];
    const [previousLongitude, previousLatitude] = polygon[previous];
    const crossesLatitude = (currentLatitude > latitude) !== (previousLatitude > latitude);
    if (crossesLatitude) {
      const boundaryLongitude = (previousLongitude - currentLongitude) * (latitude - currentLatitude)
        / (previousLatitude - currentLatitude) + currentLongitude;
      if (longitude < boundaryLongitude) inside = !inside;
    }
  }
  return inside;
}

function inEllipse(longitude: number, latitude: number, centerLongitude: number, centerLatitude: number, radiusLongitude: number, radiusLatitude: number): boolean {
  const x = (longitude - centerLongitude) / radiusLongitude;
  const y = (latitude - centerLatitude) / radiusLatitude;
  return x * x + y * y < 1;
}

function isLand(longitude: number, latitude: number): boolean {
  const wrappedLongitude = normaliseLongitude(longitude);
  const antarcticCoast = -68 - Math.sin(wrappedLongitude * DEG_TO_RAD * 3) * 3 - Math.sin(wrappedLongitude * DEG_TO_RAD * 7) * 1.4;
  if (latitude < antarcticCoast) return true;

  const onLandmass = LANDMASSES.some((polygon) => pointInPolygon(wrappedLongitude, latitude, polygon));
  if (!onLandmass) return false;

  // A handful of negative shapes keep the low-resolution land blocks from
  // reading as solid blobs and make the most recognisable inland seas visible.
  const inGreatLakes = inEllipse(wrappedLongitude, latitude, -84, 46, 6.5, 3.2);
  const inHudsonBay = inEllipse(wrappedLongitude, latitude, -84, 58, 10, 6.5);
  const inCaspianSea = inEllipse(wrappedLongitude, latitude, 51, 42, 4, 6);
  return !inGreatLakes && !inHudsonBay && !inCaspianSea;
}

function surfaceNoise(longitude: number, latitude: number): number {
  const value = Math.sin(longitude * 17.17 + latitude * 31.73) * 43758.5453;
  return value - Math.floor(value);
}

function isCoast(longitude: number, latitude: number, land: boolean, sampleDistance: number): boolean {
  return isLand(longitude + sampleDistance, latitude) !== land
    || isLand(longitude - sampleDistance, latitude) !== land
    || isLand(longitude, latitude + sampleDistance) !== land
    || isLand(longitude, latitude - sampleDistance) !== land;
}

function render({ columns, rows, phase, article }: RenderMessage): RenderedGlobe {
  const compositeLines: string[] = [];
  const coastLines: string[] = [];
  const landLines: string[] = [];
  const oceanLines: string[] = [];
  const sampleDistance = article ? 1.25 : 2.6;

  for (let y = 0; y < rows; y += 1) {
    let compositeLine = '';
    let coastLine = '';
    let landLine = '';
    let oceanLine = '';
    const screenY = y / Math.max(rows - 1, 1) * 2 - 1;

    const append = (character: string, layer?: SurfaceLayer) => {
      compositeLine += character;
      coastLine += layer === 'coast' ? character : ' ';
      landLine += layer === 'land' ? character : ' ';
      oceanLine += layer === 'ocean' ? character : ' ';
    };

    for (let x = 0; x < columns; x += 1) {
      const screenX = x / Math.max(columns - 1, 1) * 2 - 1;
      const radiusSquared = screenX * screenX + screenY * screenY;
      if (radiusSquared > 1) {
        append(' ');
        continue;
      }

      const z = Math.sqrt(1 - radiusSquared);
      const longitude = normaliseLongitude((Math.atan2(screenX, z) + phase) * RAD_TO_DEG);
      const latitude = Math.asin(-screenY) * RAD_TO_DEG;
      const diffuseLight = Math.max(0, screenX * -0.32 + screenY * -0.2 + z * 0.95);
      const rimLight = Math.pow(1 - z, 2.4);
      const land = isLand(longitude, latitude);
      const coast = isCoast(longitude, latitude, land, sampleDistance);
      const texture = surfaceNoise(longitude, latitude);

      if (radiusSquared > 0.965) {
        append(diffuseLight > 0.24 ? '*' : '.', 'coast');
      } else if (coast) {
        append(diffuseLight > 0.42 ? '@' : '*', 'coast');
      } else if (land) {
        if (diffuseLight > 0.72) append(texture > 0.58 ? '@' : '#', 'land');
        else if (diffuseLight > 0.42) append(texture > 0.5 ? '#' : '*', 'land');
        else if (diffuseLight > 0.2) append(texture > 0.62 ? '*' : ':', 'land');
        else append(texture > 0.82 ? '.' : ' ', 'land');
      } else if (diffuseLight > 0.67 && texture > 0.42) {
        append('~', 'ocean');
      } else if (diffuseLight > 0.38 && texture > 0.68) {
        append(':', 'ocean');
      } else if (rimLight > 0.45 && texture > 0.76) {
        append('.', 'ocean');
      } else {
        append(' ');
      }
    }
    compositeLines.push(compositeLine);
    coastLines.push(coastLine);
    landLines.push(landLine);
    oceanLines.push(oceanLine);
  }

  return {
    coast: coastLines.join('\n'),
    composite: compositeLines.join('\n'),
    land: landLines.join('\n'),
    ocean: oceanLines.join('\n')
  };
}

self.addEventListener('message', (event: MessageEvent<RenderMessage>) => {
  if (event.data.type !== 'render') return;
  self.postMessage(render(event.data));
});
