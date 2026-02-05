// Map styles
const mapStyles = [
    {
        name: 'Stamen Toner',
        tiles: ['https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}@2x.png'],
        attribution: '© Stadia Maps © Stamen Design © OpenStreetMap'
    },
    {
        name: 'Stamen Toner Lines',
        tiles: ['https://tiles.stadiamaps.com/tiles/stamen_toner_lines/{z}/{x}/{y}@2x.png'],
        attribution: '© Stadia Maps © Stamen Design © OpenStreetMap'
    },
    {
        name: 'Stamen Terrain Lines',
        tiles: ['https://tiles.stadiamaps.com/tiles/stamen_terrain_lines/{z}/{x}/{y}@2x.png'],
        attribution: '© Stadia Maps © Stamen Design © OpenStreetMap'
    },
    {
        name: 'CARTO Dark',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
        attribution: '© CARTO © OpenStreetMap'
    },
];
let currentStyleIndex = 0;

// locations
const locations = [
    { id: 'shanghai', name: 'Shanghai', org: 'rect_repair', coords: [121.4737, 31.2304] },
    { id: 'tokyo', name: 'Tokyo', org: 'gaemz', coords: [139.6917, 35.6895] },
    { id: 'hague', name: 'The Hague', org: 'Jana Romanova', coords: [4.3007, 52.0705] },
    { id: 'london', name: 'London', org: 'studio playfool', coords: [-0.1276, 51.5074] },
    { id: 'mexico', name: 'Mexico City', org: 'Diego', coords: [-99.1332, 19.4326] }
];

// Get line coordinates, handling antimeridian crossing for shortest visual path
function getLineCoords(coord1, coord2) {
    let lon1 = coord1[0];
    let lon2 = coord2[0];
    const lat1 = coord1[1];
    const lat2 = coord2[1];

    // Check if crossing antimeridian is shorter
    const directDiff = Math.abs(lon2 - lon1);
    const wrapDiff = 360 - directDiff;

    if (wrapDiff < directDiff) {
        if (lon2 > lon1) {
            lon2 -= 360;
        } else {
            lon2 += 360;
        }
    }

    return [[lon1, lat1], [lon2, lat2]];
}

// Initialize map with Stamen Toner (blueprint style) via Stadia Maps
const map = new maplibregl.Map({
    container: 'map',
    style: {
        version: 8,
        sources: {
            'stamen-toner': {
                type: 'raster',
                tiles: [
                    'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}@2x.png'
                ],
                tileSize: 256,
                attribution: '© Stadia Maps © Stamen Design © OpenMapTiles © OpenStreetMap'
            }
        },
        layers: [{
            id: 'stamen-toner-layer',
            type: 'raster',
            source: 'stamen-toner',
            minzoom: 0,
            maxzoom: 19
        }]
    },
    center: [30, 35],
    zoom: 1.8,
    maxZoom: 18,
    minZoom: 1
});

const popups = {};

// Style switcher - press M to cycle, or click the style indicator
// function switchStyle(index) {
//     currentStyleIndex = index % mapStyles.length;
//     const style = mapStyles[currentStyleIndex];

//     // Listen for this specific style load before setting
//     map.once('style.load', () => {
//         console.log('Style loaded, adding overlays...');
//         addOverlays();
//     });

//     map.setStyle({
//         version: 8,
//         sources: {
//             'basemap': {
//                 type: 'raster',
//                 tiles: style.tiles,
//                 tileSize: 256,
//                 attribution: style.attribution
//             }
//         },
//         layers: [{
//             id: 'basemap-layer',
//             type: 'raster',
//             source: 'basemap',
//             minzoom: 0,
//             maxzoom: 19
//         }]
//     });

//     // Update indicator
//     const indicator = document.getElementById('style-indicator');
//     if (indicator) indicator.textContent = style.name;

//     console.log(`Map style: ${style.name}`);
// }

// Keyboard shortcut: M to cycle styles, < > to go prev/next
// document.addEventListener('keydown', (e) => {
//     if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
//     if (e.key === 'm' || e.key === 'M') {
//         switchStyle(currentStyleIndex + 1);
//     } else if (e.key === ',') {
//         switchStyle(currentStyleIndex - 1 + mapStyles.length);
//     } else if (e.key === '.') {
//         switchStyle(currentStyleIndex + 1);
//     }
// });

// Overlay data - created once
const connectionFeatures = [];
for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
        const coords = getLineCoords(locations[i].coords, locations[j].coords);
        connectionFeatures.push({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords }
        });
    }
}

const nodeFeatures = locations.map(loc => ({
    type: 'Feature',
    properties: { id: loc.id, name: loc.name, org: loc.org },
    geometry: { type: 'Point', coordinates: loc.coords }
}));

// Animation state
let pulsePhase = 0;
let animationRunning = false;

function animatePulse() {
    if (!map.getLayer('node-glow')) return;
    pulsePhase += 0.05;
    const radius = 15 + Math.sin(pulsePhase) * 8;
    const opacity = 0.3 + Math.sin(pulsePhase) * 0.2;
    map.setPaintProperty('node-glow', 'circle-radius', radius);
    map.setPaintProperty('node-glow', 'circle-opacity', Math.max(0.1, opacity));
    requestAnimationFrame(animatePulse);
}

// Add overlays function - called on every style load
function addOverlays() {
    try {
        // Add connections source and layer
        map.addSource('connections', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: connectionFeatures }
        });

        map.addLayer({
            id: 'connection-lines',
            type: 'line',
            source: 'connections',
            paint: {
                'line-color': '#0000ff',
                'line-width': 2,
                'line-dasharray': [2, 2],
                'line-opacity': 0.8
            }
        });

        // Add nodes source and layers
        map.addSource('nodes', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: nodeFeatures }
        });

        map.addLayer({
            id: 'node-glow',
            type: 'circle',
            source: 'nodes',
            paint: {
                'circle-radius': 15,
                'circle-color': '#ccff00ff',
                'circle-opacity': 0.4,
                'circle-blur': 0.8
            }
        });

        map.addLayer({
            id: 'node-markers',
            type: 'circle',
            source: 'nodes',
            paint: {
                'circle-radius': 5,
                'circle-color': '#f2ff00ff',
                'circle-stroke-width': 3,
                'circle-stroke-color': '#0022ffff'
            }
        });

        console.log('Overlays added successfully');
    } catch (e) {
        console.error('Error adding overlays:', e);
    }

    // Start animation if not running
    if (!animationRunning) {
        animationRunning = true;
        animatePulse();
    }
}

// Create popups once
locations.forEach(loc => {
    popups[loc.id] = new maplibregl.Popup({
        offset: 15,
        closeButton: true,
        closeOnClick: false
    }).setHTML(`
        <div class="marker-popup">
            <h4>${loc.name}</h4>
            <div class="org">${loc.org}</div>
            <div class="coord">${loc.coords[1].toFixed(4)}°, ${loc.coords[0].toFixed(4)}°</div>
        </div>
    `);
});

// Add overlays on initial map load
map.on('load', () => {
    console.log('Initial map load, adding overlays...');
    addOverlays();
});

// Click on markers
map.on('click', 'node-markers', (e) => {
    const props = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates.slice();
    Object.values(popups).forEach(p => p.remove());
    popups[props.id].setLngLat(coords).addTo(map);
});

// Hover cursor
map.on('mouseenter', 'node-markers', () => {
    map.getCanvas().style.cursor = 'pointer';
});
map.on('mouseleave', 'node-markers', () => {
    map.getCanvas().style.cursor = '';
});

// Coordinate display
map.on('mousemove', (e) => {
    const el = document.getElementById('hover-coord');
    if (el) el.textContent = `${e.lngLat.lat.toFixed(4)}°, ${e.lngLat.lng.toFixed(4)}°`;
});

// Sidebar click
document.querySelectorAll('.location-item').forEach(item => {
    item.addEventListener('click', () => {
        const cityId = item.dataset.city;
        const loc = locations.find(l => l.id === cityId);
        if (loc) {
            Object.values(popups).forEach(p => p.remove());
            map.flyTo({ center: loc.coords, zoom: 6, duration: 2000 });
            setTimeout(() => {
                popups[cityId].setLngLat(loc.coords).addTo(map);
            }, 2000);
        }
    });
});

// Time update
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const el = document.getElementById('current-time');
    if (el) el.textContent = time;
}
updateTime();
setInterval(updateTime, 1000);
