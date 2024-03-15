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
let addedSources = [];

map.on('load', () => {

  // Fetch JSON data from dimes.json
  fetch('dimesA.json')
    .then(response => response.json())
    .then(async jsonData => {
      // Assign jsonData to the data variable in the outer scope
      data = jsonData;
      
      // Sort data based on OwnerNumber
      data.sort((a, b) => {
        const ownerNumberA = parseInt(a.OwnerNumber.replace('Owner', ''));
        const ownerNumberB = parseInt(b.OwnerNumber.replace('Owner', ''));
        return ownerNumberB - ownerNumberA;
      });

      processUpdatedData(data);

      // Call the function with your data
      addMarkers(data);

      const yearRange = document.getElementById('yearRange');
      const selectedYear = document.getElementById('selectedYear');

      yearRange.addEventListener('input', async (event)=> {
        // Clear existing sources and layers
        clearMap();

        fetch('dimesA.json')
        .then(response => response.json())
        .then(async jsonData => {
          // Assign jsonData to the data variable in the outer scope
          data = jsonData;
          
          // Sort data based on OwnerNumber
          data.sort((a, b) => {
            const ownerNumberA = parseInt(a.OwnerNumber.replace('Owner', ''));
            const ownerNumberB = parseInt(b.OwnerNumber.replace('Owner', ''));
            return ownerNumberB - ownerNumberA;
          });

          const selectedValue = event.target.value;
          selectedYear.textContent = selectedValue;

          // Update the data with the filtered result
          data = await updateDisplayedData(selectedValue);
          processUpdatedData(data);
          addMarkers(data);
        })
      });

      // Add an event listener to the legend element
      document.getElementById('legend').addEventListener('click', toggleCirclesVisibility);
    })
    .catch(error => console.error('Error fetching JSON:', error));
});

// Function to group data by a key
function groupBy(data, key) {
  return data.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

// Add start and end circles
function drawStartEndCircles(startLocation, endLocation, i, ownerGroup) {
  // Check if ownerGroup has at least 2 data points
  if (ownerGroup.length < 2) {
    return; // Do nothing if there are fewer than 2 data points
  }
  
  // Determine class names based on the iteration
  const startCircleClass = i === 0 ? 'start-circle' : '';
  const endCircleClass = i === ownerGroup.length - 2 ? 'end-circle' : '';

  // Add the start circle marker
  const startEl = document.createElement('div');
  startEl.className = `${startCircleClass}`;
  startEl.style.pointerEvents = 'none';
  const startMarker = new mapboxgl.Marker(startEl)
    .setLngLat([parseFloat(startLocation.Longitude), parseFloat(startLocation.Latitude)])
    .addTo(map);

  // Add the end circle marker
  const endEl = document.createElement('div');
  endEl.className = `${endCircleClass}`;
  endEl.style.pointerEvents = 'none';
  const endMarker = new mapboxgl.Marker(endEl)
    .setLngLat([parseFloat(endLocation.Longitude), parseFloat(endLocation.Latitude)])
    .addTo(map);

  // Add text next to the start circle
  if (i === 0) {
    const startText = document.createElement('div');
    startText.className = 'start-text';
    startText.innerHTML = '';
    startMarker.getElement().appendChild(startText);
  }

  // Add text next to the end circle
  if (i === ownerGroup.length - 2) {
    const endText = document.createElement('div');
    endText.className = 'end-text';
    endText.innerHTML = '';
    endMarker.getElement().appendChild(endText);
  }

  // Bring the markers to the back
  startMarker.getElement().style.zIndex = 0;
  endMarker.getElement().style.zIndex = 0;
}

// Add selected owner's line
function drawAdditionalLines(ownerGroup) {
  // Sort locations within the group by RecOpenYear and Seq
  ownerGroup.sort((a, b) => a.RecOpenYear - b.RecOpenYear || a.Seq - b.Seq);

  // Draw lines and add arrowheads for all consecutive locations for the same owner
  for (let i = 0; i < ownerGroup.length - 1; i++) {
    const startLocation = ownerGroup[i];
    const endLocation = ownerGroup[i + 1];
    const lineId = `additional-line-${startLocation.RecOpenYear}-${startLocation.Seq}-${startLocation.OwnerName}-${endLocation.RecOpenYear}-${endLocation.Seq}-${endLocation.OwnerName}`;
    
    // Check if the layer with the given lineId already exists
    if (
      map.getLayer(`${lineId}-start-label-layer`) ||
      map.getLayer(`${lineId}-end-label-layer`)
    ) {
      // Skip adding the layer if it already exists
      continue;
    }

    // console.log("lineId:", lineId)

    // Call the function to draw start and end circles
    drawStartEndCircles(startLocation, endLocation, i, ownerGroup);
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
    if (!map.getSource(lineId)) {
      // Source doesn't exist, proceed with adding the source
      map.addSource(lineId, {
        type: 'geojson',
        data: line,
      });
    }

    // Add the layer with style
    map.addLayer({
      id: `${lineId}-line-layer`,
      type: 'line',
      source: lineId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': 'rgb(232, 60, 60)',
        'line-width': 10,
        'line-opacity': 1,
      },
    });

    map.addLayer({
      id: `${lineId}-arrow-layer`,
      type: 'symbol',
      source: lineId,
      layout: {
        'text-field': '▶',
        'text-size': 20,
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map',
        'symbol-spacing': 200,
        'text-keep-upright': false, 
      },
      paint: {
        'text-color': 'rgba(255, 255, 255, 0.5)',
      },
    });
    
    // Add the label layer
    if (startLocation.DBA !== endLocation.DBA) {
      // Add the label layer for startLocation
      map.addLayer({
        id: `${lineId}-start-label-layer`,
        type: 'symbol',
        source: {
          type: 'geojson',
          data: {
            type: 'Point',
            coordinates: [
              parseFloat(startLocation.Longitude),
              parseFloat(startLocation.Latitude)
            ],
          },
        },
        layout: {
          'text-field': startLocation.DBA,
          'text-size': 9,
          'symbol-placement': 'point',
          'text-offset': [1, 0],
          'text-anchor': 'left',
        },
        paint: {
          'text-color': 'rgb(232, 60, 60)',
          'text-halo-color': 'white',
          'text-halo-width': 1,
        },
      });

      // Add the label layer for endLocation
      map.addLayer({
        id: `${lineId}-end-label-layer`,
        type: 'symbol',
        source: {
          type: 'geojson',
          data: {
            type: 'Point',
            coordinates: [
              parseFloat(endLocation.Longitude),
              parseFloat(endLocation.Latitude)
            ],
          },
        },
        layout: {
          'text-field': endLocation.DBA,
          'text-size': 9,
          'symbol-placement': 'point',
          'text-offset': [1, 0],
          'text-anchor': 'left',
        },
        paint: {
          'text-color': 'rgb(232, 60, 60)',
          'text-halo-color': 'white',
          'text-halo-width': 1,
        },
      });
    }
  }
}

// Function to clear existing additional lines
function clearAdditionalLines() {
  const additionalLineLayers = map.getStyle().layers.filter(layer => layer.id.endsWith('-line-layer'));
  const additionalArrowheadLayers = map.getStyle().layers.filter(layer => layer.id.endsWith('-arrow-layer'));
  const additionalStartLabelLayers = map.getStyle().layers.filter(layer => layer.id.endsWith('-start-label-layer'));
  const additionalEndLabelLayers = map.getStyle().layers.filter(layer => layer.id.endsWith('-end-label-layer'));

  additionalArrowheadLayers.forEach(layer => {
    // Remove the layer
    map.removeLayer(layer.id);
  });

  additionalLineLayers.forEach(layer => {
    // Remove the layer
    map.removeLayer(layer.id);

    // Check if the source exists before removing
    if (map.getSource(layer.source)) {
      map.removeSource(layer.source);
    }
  });

  additionalStartLabelLayers.forEach(layer => {
    // Remove the layer
    map.removeLayer(layer.id);

    // Check if the source exists before removing
    if (map.getSource(layer.source)) {
      map.removeSource(layer.source);
    }
  });

  additionalEndLabelLayers.forEach(layer => {
    // Remove the layer
    map.removeLayer(layer.id);

    // Check if the source exists before removing
    if (map.getSource(layer.source)) {
      map.removeSource(layer.source);
    }
  });

  clearStartEndCircles();
}


// Function to clear existing start/end circles
function clearStartEndCircles() {
  // Remove all markers with class .start-circle and .end-circle
  const circleMarkers = document.querySelectorAll('.start-circle, .end-circle');
  circleMarkers.forEach(marker => marker.remove());

  // Remove all markers with class .circle-marker and zIndex = 0
  const zIndex0Markers = document.querySelectorAll('.mapboxgl-marker');
  zIndex0Markers.forEach(marker => {
    if (parseInt(marker.style.zIndex) === 0) {
      marker.remove();
    }
  });
}

// Define a variable to keep track of visibility
let circlesVisible = false;

// Function to toggle the visibility of start and end circles
function toggleCirclesVisibility() {

  // Check the visibility state
  if (circlesVisible) {
    // Clear all start and end circles
    clearStartEndCircles();
  } else {
    // Get all owner groups
    const allOwnerGroups = Object.values(groupBy(data, 'OwnerName'));

  // Iterate through each owner group
  allOwnerGroups.forEach((ownerGroup, index) => {
    // console.log(`Owner Group ${index + 1}:`, ownerGroup);

    // Sort locations within the group by RecOpenYear and Seq
    ownerGroup.sort((a, b) => a.RecOpenYear - b.RecOpenYear || a.Seq - b.Seq);

    // Draw start and end circles for each owner group
    for (let i = 0; i < ownerGroup.length - 1; i++) {
      drawStartEndCircles(ownerGroup[i], ownerGroup[i + 1], i, ownerGroup);
    }
  });
  }

  // Toggle the visibility state for the next click
  circlesVisible = !circlesVisible;
}

// Show Panorama View
function showPanorama(panoramaImageUrl) {
  // Hide 'circle-marker' elements
  const circleMarkers = document.querySelectorAll('.circle-marker, .mapboxgl-marker');
  circleMarkers.forEach(marker => {
    marker.style.display = 'none';
  });

  // Hide popups with class 'custom-popup'
  const popups = document.querySelectorAll('.custom-popup');
  popups.forEach(popup => {
    popup.style.display = 'none';
  });

  // Hide the map canvas
  map.getCanvas().style.display = 'none';

  // Update the style of the heading element during panorama view
  const headingElement = document.querySelector('.heading');
  headingElement.style.color = 'white';

  const legendElement = document.querySelector('.legend');
  legendElement.style.display = 'none';

  const yearBar = document.querySelector('.yearBar');
  yearBar.style.display = 'none';

  // Show the panorama container
  const panoramaContainer = document.getElementById('panorama-container');
  panoramaContainer.style.display = 'block';
  panoramaContainer.style.zIndex = '1001'; // Set z-index to be on top of map elements
  panoramaContainer.style.height = '100vh'; // Set height to 100% of viewport height

  // Clear the panorama container content
  panoramaContainer.innerHTML = '';

  // Create and append the loading message
  const loadingMessage = document.createElement('div');
  loadingMessage.innerHTML = 'Loading...';
  loadingMessage.classList.add('loading-message');
  panoramaContainer.appendChild(loadingMessage);

  // Create the PANOLENS viewer after the loading message is added
  const viewer = new PANOLENS.Viewer({ container: panoramaContainer, output: 'console' });

  // Handle the close button click event
  const closeButton = document.createElement('button');
  closeButton.innerHTML = 'Close Pano';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.zIndex = '1003'; // Set z-index to be on top of panorama container
  closeButton.style.cursor = 'pointer';
  closeButton.id = 'closePanorama';
  closeButton.addEventListener('click', () => {
    // Show 'circle-marker' elements
    circleMarkers.forEach(marker => {
      marker.style.display = 'block';
    });

    headingElement.style.color = '';
    legendElement.style.display = '';
    yearBar.style.display = '';

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

  // Set a timeout to remove the loading message after 2 second
  setTimeout(() => {
    // Remove the loading message after 2 second
    panoramaContainer.removeChild(loadingMessage);
    //time
  }, 2000);

  // Set up event listener for when the panorama image is loaded
  panorama.addEventListener('enter', function () {
    // Remove the loading message when the panorama is loaded
    panoramaContainer.removeChild(loadingMessage);
  });

  // Set the initial field of view to achieve the desired wide-angle effect
  viewer.camera.fov = 85;  // Adjust this value accordingly

  // Update the projection matrix to reflect the FOV change
  viewer.camera.updateProjectionMatrix();

  // Define the new target position as a THREE.Vector3
  const newTargetPosition = new THREE.Vector3(-3, -0.5, 0);

  // Animate the movement of the control center to the new position over 0 second
  viewer.tweenControlCenter(newTargetPosition, 0);
}

// Add click event listener to the h1 element
document.getElementById('refreshButton').addEventListener('click', function() {
  // Reload the page
  location.reload();
});

// Function to update displayed data based on the selected year
async function updateDisplayedData(selectedYear) {

  // Filter the data based on the selected year and earlier
  const filteredData = data.filter(item => parseInt(item.RecOpenYear) <= selectedYear);
  return filteredData;
}

// Function to clear existing sources and layers
function clearMap() {
  clearAdditionalLines();
  // Remove 'circle-marker' elements
  const circleMarkers = document.querySelectorAll('.circle-marker, .mapboxgl-marker');
  circleMarkers.forEach(marker => {
    marker.remove();
  });

  // Iterate through the map style layers
  const styleLayers = map.getStyle().layers;
  styleLayers.forEach(layer => {
    // Check if the layer's source starts with 'line-' or 'arrowhead-'
    if (layer.source && (layer.source.startsWith('arrowhead-') || layer.source.startsWith('line-'))) {
      map.removeLayer(layer.id);
    }
  });

  // Hide popups with class 'custom-popup'
  const popups = document.querySelectorAll('.custom-popup');
  popups.forEach(popup => {
    popup.style.display = 'none';
  });
}

// Function to process the updated data
function processUpdatedData(data) {
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
      if (!map.getSource(lineId)) {
        // Source doesn't exist, proceed with adding the source
        map.addSource(lineId, {
          type: 'geojson',
          data: line,
        });
      }

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
          'line-color': 'black',
          'line-width': 1.5,
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
          'text-color': 'rgba(0, 0, 0, 0.5)',
        },
      });
    }
  });
}

// Add a click event listener to each circle marker
function addMarkers(data) {
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
              <img src="${point.img1}" alt="Image" style="max-width: 100%; height: auto; cursor: pointer;" onclick="showPanorama('${point.img2}')" loading="progressive">
              <p>Owners: ${point.OwnerList.map((owner, index) => `<span class="owner-link ${index === 0 ? 'clicked' : ''}" data-owner="${owner}">${owner}</span>`).join(', ')}</p>
          </div>
      `))
      .addTo(map);

    // Add tooltip on marker hover
    marker.getElement().setAttribute('title', point.DBA);  

    // Add click event listener to each marker
    marker.getElement().addEventListener('click', () => {
      marker.togglePopup();
      
      // Clear existing layers only if they exist
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
            console.log('Owner Clicked:', selectedOwner);

            // Clear existing layers
            clearAdditionalLines();

            // Remove the 'clicked' class from all owner links
            document.querySelectorAll('.owner-link').forEach(link => link.classList.remove('clicked'));

            // Add the 'clicked' class to the clicked owner link
            ownerLink.classList.add('clicked');

            // Get the selected owner's group directly from the clicked owner link
            const selectedOwnerGroup = groupBy(data, 'OwnerName')[selectedOwner];

            // Log the selectedOwnerGroup to the console
            console.log('Owner Clicked - Selected Owner Group:', selectedOwnerGroup);

            // Draw additional consecutive lines for the same owner
            drawAdditionalLines(selectedOwnerGroup);
          });
        });
      }, 0); // Adding a minimal delay
    });
  });
}
