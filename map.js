mapboxgl.accessToken = 'pk.eyJ1IjoiYm9zc2Jvc3NsZXUiLCJhIjoiY2trcHU5N2EyMGJwdDJvbnRvc2g2djNubSJ9.MH9jCElgj_r1kHN305ijZw';

var bounds = [
  [-74.8, 40.00], // southwest coordinates
  [-73.3, 41.00] // northeast coordinates
];

const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/bossbossleu/clqqdfjxl007h01ra55ayfq1s', // style URL
  center: [-73.988, 40.715], // starting position [lng, lat]
  zoom: 13,
  maxZoom: 16,
  minZoom: 10,
  maxBounds: bounds,
});

let originalLayers = [];
let originalSources = [];

map.on('load', () => {
  
  // Fetch JSON data from dimes.json
  fetch('dimesA.json')
    .then(response => response.json())
    .then(data => {
      data.forEach(point => {
        const el = document.createElement('div');
        el.className = 'circle-marker';
      
        if (point.Class === 'A') {
          el.classList.add('class-a');
        } else if (point.Class === 'B' || point.Class === 'C' || point.Class === 'D') {
          el.classList.add('class-bcd');
        }
      
        // Create a marker with a click event
        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(point.Longitude), parseFloat(point.Latitude)])
          .setPopup(new mapboxgl.Popup({ className: 'custom-popup' }).setHTML(`
            <div style="max-width: 360px;">
              <h3>${point.DBA}</h3>
              <p>${point.RecOpenYear}</p>
              <img src="${point.img1}" alt="Image" style="max-width: 100%; height: auto; cursor: pointer;" onclick="showPanorama('${point.img2}')">
              <p>${point.OwnerList}</p>
            </div>
          `))
          .addTo(map);
      });

      // Iterate through each OwnerName group
      Object.values(groupBy(data, 'OwnerName')).forEach(ownerGroup => {
        // Sort locations within the group by RecOpenYear and Seq
        ownerGroup.sort((a, b) => a.RecOpenYear - b.RecOpenYear || a.Seq - b.Seq);

        // Draw lines and add arrowheads for all consecutive locations for the same owner
        for (let i = 0; i < ownerGroup.length - 1; i++) {
          const startLocation = ownerGroup[i];
          const endLocation = ownerGroup[i + 1];

          const lineId = `line-${startLocation.RecOpenYear}-${startLocation.Seq}-${startLocation.OwnerName}-${endLocation.RecOpenYear}-${endLocation.Seq}-${endLocation.OwnerName}`;

          const line = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [parseFloat(startLocation.Longitude), parseFloat(startLocation.Latitude)],
                [parseFloat(endLocation.Longitude), parseFloat(endLocation.Latitude)],
              ],
            },
          };

          // Add the source
          map.addSource(lineId, {
            type: 'geojson',
            data: line,
          });

          // Add the layer
          map.addLayer({
            id: `line-layer-${lineId}`,
            type: 'line',
            source: lineId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': 'blue',
              'line-width': 2,
              'line-opacity': 0.1,
            },
          });

          // Add the arrowhead symbol layer with text along the line
          map.addLayer({
            id: `arrowhead-layer-${lineId}`,
            type: 'symbol',
            source: lineId,
            layout: {
              'text-field': '▶',
              'text-size': 12,
              'text-rotation-alignment': 'map',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
              'text-anchor': 'center',
              'symbol-placement': 'line',
            },
            paint: {
              'text-color': 'blue',
            },
          });
        }
      });

    })
    .catch(error => console.error('Error fetching JSON:', error));
});

// Function to group data by a specific key
function groupBy(data, key) {
  return data.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

function showPanorama(panoramaImageUrl) {
  // Hide 'circle-marker' elements
  const circleMarkers = document.querySelectorAll('.circle-marker');
  circleMarkers.forEach(marker => {
    marker.style.display = 'none';
  });

  // Hide popups with class 'custom-popup'
  const popups = document.querySelectorAll('.custom-popup');
  popups.forEach(popup => {
    popup.style.display = 'none';
  });

  // Show the panorama container
  const panoramaContainer = document.getElementById('panorama-container');
  panoramaContainer.style.display = 'block';
  panoramaContainer.style.zIndex = '1001'; // Set z-index to be on top of map elements
  panoramaContainer.style.height = '100vh'; // Set height to 100% of viewport height

  map.getCanvas().style.display = 'none';
  panoramaContainer.innerHTML = '';
  const viewer = new PANOLENS.Viewer({ container: panoramaContainer, output: 'console' });

  // Handle the close button click event
  const closeButton = document.createElement('button');
  closeButton.innerHTML = 'Close Panorama';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.left = '10px';
  closeButton.style.zIndex = '1002'; // Set z-index to be on top of panorama container
  closeButton.addEventListener('click', () => {
    // Show 'circle-marker' elements
    circleMarkers.forEach(marker => {
      marker.style.display = 'block';
    });

    popups.forEach(popup => {
      popup.style.display = 'block';
    });
    map.getCanvas().style.display = 'block';
    panoramaContainer.style.display = 'none';
    viewer.dispose();
  });

  // Add the close button to the panorama container
  panoramaContainer.appendChild(closeButton);
  const panorama = new PANOLENS.ImagePanorama(panoramaImageUrl);
  viewer.add(panorama);
}














