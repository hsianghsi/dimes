mapboxgl.accessToken = 'pk.eyJ1IjoiYm9zc2Jvc3NsZXUiLCJhIjoiY2trcHU5N2EyMGJwdDJvbnRvc2g2djNubSJ9.MH9jCElgj_r1kHN305ijZw';

var bounds = [
  [-80.0, 32.0], // southwest coordinates
  [0, 51.0] // northeast coordinates
];

const map = new mapboxgl.Map({
  container: 'map', // container ID
  style: 'mapbox://styles/bossbossleu/clqqdfjxl007h01ra55ayfq1s', // style URL
  center: [-73.9911, 40.71468], // starting position [lng, lat]
  zoom: 14,
  maxZoom: 16,
  minZoom: 9,
  maxBounds: bounds,
});

let originalLayers = [];
let originalSources = [];

map.on('load', () => {

  // Fetch JSON data from dimes.json
  fetch('dimesA.json')
    .then(response => response.json())
    .then(data => {

      // Sort data based on OwnerNumber
      data.sort((a, b) => {
        const ownerNumberA = parseInt(a.OwnerNumber.replace('Owner', ''));
        const ownerNumberB = parseInt(b.OwnerNumber.replace('Owner', ''));
        return ownerNumberB - ownerNumberA;
      });

      // Add a click event listener to each circle marker
      data.forEach(point => {
        const el = document.createElement('div');
        el.className = 'circle-marker';

        if (point.Class === 'A') {
          el.classList.add('class-a');
        } else if (point.Class === 'B' || point.Class === 'C' || point.Class === 'D') {
          el.classList.add('class-bcd');
        }

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(point.Longitude), parseFloat(point.Latitude)])
          .setPopup(new mapboxgl.Popup({ className: 'custom-popup' }).setHTML(`
              <div>
                  <h3>${point.DBA}</h3>
                  <p>Open Year: ${point.RecOpenYear}</p>
                  <img src="${point.img1}" alt="Image" style="max-width: 100%; height: auto; cursor: pointer;" onclick="showPanorama('${point.img2}')">
                  <p>Owners: ${point.OwnerList.map((owner, index) => `<span class="owner-link ${index === 0 ? 'clicked' : ''}" data-owner="${owner}">${owner}</span>`).join(', ')}</p>
              </div>
          `))
          .addTo(map);

        // Add click event listener to each marker
        marker.getElement().addEventListener('click', () => {
          // Clear existing layers
          clearAdditionalLines();

          // Get the selected owner's group based on the clicked marker
          const selectedOwnerGroup = groupBy(data, 'OwnerName')[point.OwnerName];

          // Log the selectedOwnerGroup to the console
          console.log('Selected Owner Group:', selectedOwnerGroup);

          // Draw additional consecutive lines for the same owner
          drawAdditionalLines(selectedOwnerGroup);

          // Attach event listeners to owner links when the popup is open
          setTimeout(() => { // Delay to ensure the links are rendered in the DOM
            document.querySelectorAll('.owner-link').forEach(ownerLink => {
              ownerLink.addEventListener('click', () => {
                const selectedOwner = ownerLink.dataset.owner;
                console.log('Owner Link Clicked:', selectedOwner);

                // Clear existing layers
                clearAdditionalLines();

                // Remove the 'clicked' class from all owner links
                document.querySelectorAll('.owner-link').forEach(link => link.classList.remove('clicked'));

                // Add the 'clicked' class to the clicked owner link
                ownerLink.classList.add('clicked');

                // Get the selected owner's group directly from the clicked owner link
                const selectedOwnerGroup = groupBy(data, 'OwnerName')[selectedOwner];

                // Log the selectedOwnerGroup to the console
                console.log('Owner Link Clicked - Selected Owner Group:', selectedOwnerGroup);

                // Draw additional consecutive lines for the same owner
                drawAdditionalLines(selectedOwnerGroup);
              });
            });
          }, 0); // Adding a minimal delay
        });
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
              'symbol-placement': 'line',
              'text-rotation-alignment': 'map',
              'symbol-spacing': 150,
              'text-keep-upright': false, 
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

// Function to group data by a specificlearAdditionalLinesc key
function groupBy(data, key) {
  return data.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

function drawAdditionalLines(ownerGroup) {
  // Sort locations within the group by RecOpenYear and Seq
  ownerGroup.sort((a, b) => a.RecOpenYear - b.RecOpenYear || a.Seq - b.Seq);

  // Draw lines and add arrowheads for all consecutive locations for the same owner
  for (let i = 0; i < ownerGroup.length - 1; i++) {
    const startLocation = ownerGroup[i];
    const endLocation = ownerGroup[i + 1];

    const lineId = `additional-line-${startLocation.RecOpenYear}-${startLocation.Seq}-${startLocation.OwnerName}-${endLocation.RecOpenYear}-${endLocation.Seq}-${endLocation.OwnerName}`;

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

    // Add the layer with style
    map.addLayer({
      id: `additional-line-layer-${lineId}`,
      type: 'line',
      source: lineId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'blue',
        'line-width': 2,
        'line-opacity': 1,
      },
    });
  }
}

// Function to clear existing additional lines
function clearAdditionalLines() {
  const additionalLineLayers = map.getStyle().layers.filter(layer => layer.id.startsWith('additional-line-layer-'));

  additionalLineLayers.forEach(layer => {
    const sourceId = layer.source;

    // Remove the layer
    map.removeLayer(layer.id);

    // Remove the source
    map.removeSource(sourceId);
  });
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

  // Update the style of the heading element during panorama view
  const headingElement = document.querySelector('.heading');
  headingElement.style.color = 'white';

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
  closeButton.style.right = '10px';
  closeButton.style.zIndex = '1002'; // Set z-index to be on top of panorama container
  closeButton.style.cursor = 'pointer';
  closeButton.id = 'closePanorama';
  closeButton.addEventListener('click', () => {
    // Show 'circle-marker' elements
    circleMarkers.forEach(marker => {
      marker.style.display = 'block';
    });

    headingElement.style.color = '';

    popups.forEach(popup => {
      popup.style.display = 'contents';
    });
    map.getCanvas().style.display = 'block';
    panoramaContainer.style.display = 'none';
    viewer.dispose();
  });

  // Add the close button to the panorama container
  panoramaContainer.appendChild(closeButton);

  const panorama = new PANOLENS.ImagePanorama(panoramaImageUrl);
  viewer.add(panorama);

  // Set the initial field of view to achieve the desired wide-angle effect
  viewer.camera.fov = 70;  // Adjust this value accordingly

  // Update the projection matrix to reflect the FOV change
  viewer.camera.updateProjectionMatrix();

  // Define the new target position as a THREE.Vector3
  const newTargetPosition = new THREE.Vector3(1, 0, 0);

  // Animate the movement of the control center to the new position over 1 second
  viewer.tweenControlCenter(newTargetPosition, 0);
}


















