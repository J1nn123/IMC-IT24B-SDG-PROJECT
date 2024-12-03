class Map {
    #fileName;

    constructor(fileName) {
        this.#fileName = fileName;
        this.init();
    }

    init() {
        fetch(this.#fileName)
            .then(res => res.json())
            .then(data => {
                this.mapHandler("map");
                this.loadMapData(data);
                document.getElementById("query").addEventListener("input", (event) => {
                    this.searchLocation(event.target.value.toLowerCase());
                });
            })
            .catch(error => console.error("Error fetching JSON:", error));
    }

    mapHandler(mapElementId) {
        this.map = L.map(mapElementId).setView([8.359997, 124.868352], 18);
        this.allMarkers = [];

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(this.map);
    }

    loadMapData(data) {
        if (!data?.map_polygon_vertices || !data?.map_pins) {
            throw new Error("Invalid JSON structure");
        }

        const features = L.featureGroup();

        // Main polygon
        const polygon = L.polygon(data.map_polygon_vertices, { color: "blue" })
            .addTo(this.map)
            .bindPopup(`
                <div>
                    <h4>${data.map_name}</h4>
                    <a href="${data.map_image_url || 'default-image.jpg'}" target="_blank">
                        <img src="${data.map_image_url || 'default-image.jpg'}" alt="${data.map_name}" style="width: 100%;">
                    </a>
                </div>
            `);

        features.addLayer(polygon);

        // Add pins
        data.map_pins.forEach(pin => {
            const markerHandler = new MarkerHandler(pin, this.map);
            this.allMarkers.push(markerHandler);
            features.addLayer(markerHandler.marker);
        });

        this.map.fitBounds(features.getBounds());
    }

    searchLocation(searchValue) {
        this.allMarkers.forEach(markerHandler => {
            const matchesSearch = markerHandler.pin.pin_name.toLowerCase().includes(searchValue);

            if (matchesSearch) {
                markerHandler.marker.addTo(this.map);
                markerHandler.polygon?.addTo(this.map);
            } else {
                this.map.removeLayer(markerHandler.marker);
                markerHandler.polygon && this.map.removeLayer(markerHandler.polygon);
            }
        });
    }
}

class MarkerHandler {
    constructor(pin, map) {
        this.numPc = 0;
        this.isReserved = false;
        this.isOccupied = false;
        this.pin = pin;
        this.map = map;

        this.marker = L.marker([pin.pin_lat, pin.pin_long])
            .addTo(map)
            .bindPopup(pin.pin_name);

        if (pin.pin_polygon_vertices?.length) {
            this.polygon = L.polygon(pin.pin_polygon_vertices, { color: "rgb(153, 255, 146)" })
                .addTo(map)
                .bindPopup(`${pin.pin_name} Area`);
        }

        // Store marker handler by pin_id
        markerHandlers[pin.pin_id] = this;

        // Attach click event to marker
        this.marker.on("click", () => this.handleClick());
    }

    handleClick() {
        const popupContent = `
            <div style="width: 240px;">
                <h4>${this.pin.pin_name}</h4>
                <img src="${this.pin.pin_image_url || 'default-image.jpg'}" alt="${this.pin.pin_name}" style="width: 100%; margin-bottom: 10px;">
                <p>Available PCs: ${this.numPc}/${this.pin.pin_num_pc}</p>
                <p>Usable Printers: ${this.pin.pin_num_printers}</p>
                <button class="btn btn-warning" onclick="markerHandlers['${this.pin.pin_id}'].freeBtn()">Free</button>
                <button class="btn btn-primary" onclick="markerHandlers['${this.pin.pin_id}'].reserveBtn()">Use</button>
                <button class="btn btn-danger" onclick="markerHandlers['${this.pin.pin_id}'].occupyBtn()">Occupy</button>
                <button class="btn btn-secondary" onclick="markerHandlers['${this.pin.pin_id}'].clearBtn()">Clear</button>
            </div>
        `;
        this.marker.bindPopup(popupContent).openPopup();
    }

    // Button Functionality
    freeBtn() {
        if (this.numPc === 0) {
            alert("No available PCs");
        } else {
            this.numPc--;
            this.updatePolygonState();
        }
    }

    reserveBtn() {
        if (this.numPc < this.pin.pin_num_pc) {
            this.numPc++;
            this.isReserved = true;
            this.updatePolygonState();
        } else {
            alert("All PCs are already reserved.");
        }
    }

    occupyBtn() {
        if (this.isReserved || this.numPc > 0) {
            alert("PCs are currently reserved or occupied.");
        } else {
            this.isOccupied = true;
            this.updatePolygonState();
        }
    }

    clearBtn() {
        this.numPc = 0;
        this.isReserved = false;
        this.isOccupied = false;
        this.updatePolygonState();
    }

    updatePolygonState() {
        if (!this.polygon) return;

        if (this.isOccupied) {
            this.polygon.setStyle({ color: "red" });
        } else if (this.isReserved) {
            this.polygon.setStyle({ color: "orange" });
        } else {
            this.polygon.setStyle({ color: "rgb(153, 255, 146)" });
        }
        this.handleClick();
    }
}

// Store marker handlers by pin_id
const markerHandlers = {}; 

// Initialize map with the given JSON file
const m = new Map("map.json");

// Function to update markers' actions globally
function freeBtn(pinId) {
    markerHandlers[pinId].freeBtn();
}

function reserveBtn(pinId) {
    markerHandlers[pinId].reserveBtn();
}

function occupyBtn(pinId) {
    markerHandlers[pinId].occupyBtn();
}

function clearBtn(pinId) {
    markerHandlers[pinId].clearBtn();
}