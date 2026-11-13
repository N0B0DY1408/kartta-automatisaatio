
let map;
let markers = new Map();
let stallElements = new Map();

let selectedStallNumber = null;

async function loadPlan() {

    try {

        const response = await fetch("data/active-plan.json");

        console.log("JSON-vastaus:", response.status);
        console.log("JSON-tiedoston osoite:", response.url);

        if (!response.ok) {
            throw new Error(
                `JSON-tiedoston lataaminen epäonnistui. HTTP ${response.status}`
            );
        }

        const plan = await response.json();

        console.log("Ladattu suunnitelma:", plan);

        if (!plan.map || !plan.map.center || !Array.isArray(plan.kojut)) {
            throw new Error("Suunnitelman JSON-rakenne ei ole oikeanlainen.");
        }

        document.getElementById("eventName").textContent = plan.name;

        createMap(plan);

        createStallList(plan.kojut);

        createParkingAreas(plan.parkit || []);

    } catch (error) {

        console.error("Kartan lataaminen epäonnistui:", error);

        document.getElementById("stallList").textContent =
            "Virhe: " + error.message;

    }
}



function createMap(plan) {

    const center = [
        plan.map.center.lat,
        plan.map.center.lng
    ];

    map = L.map("map").setView(center, plan.map.zoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    plan.kojut.forEach(function (koju) {

        const coordinates = [
            koju.coordinates.lat,
            koju.coordinates.lng
        ];

        const marker = L.marker(coordinates).addTo(map);

        // Luodaan ponnahdusikkunan sisältö turvallisesti
        const popupContent = document.createElement("div");

        const popupTitle = document.createElement("strong");
        popupTitle.textContent = `Koju #${koju.number}`;

        const popupName = document.createElement("p");
        popupName.textContent = koju.name;

        popupContent.append(popupTitle, popupName);

        marker.bindPopup(popupContent, {
            autoPan: false
        });

        // Tallennetaan merkki numeron avulla
        markers.set(koju.number, marker);

        // Kun karttamerkkiä painetaan, valitaan vastaava koju listasta
        marker.on("click", function () {
            selectStall(koju.number, true);
        });

    });
}



function createStallList(kojut) {

    const list = document.getElementById("stallList");

    list.innerHTML = "";

    // Tyhjennetään myös vanhat elementtiviittaukset
    stallElements.clear();

    kojut.forEach(function (koju) {

        const kojuDiv = document.createElement("div");
        kojuDiv.className = "koju";

        const title = document.createElement("h3");
        title.textContent = `Koju #${koju.number}`;

        const name = document.createElement("p");
        name.textContent = koju.name;

        kojuDiv.append(title, name);

        // Tallennetaan HTML-elementti kojun numerolla
        stallElements.set(koju.number, kojuDiv);

        // Kun listan kojua painetaan, valitaan se kartalta
        kojuDiv.addEventListener("click", function () {
            selectStall(koju.number, true);
        });

        list.appendChild(kojuDiv);

    });
}


function selectStall(number, moveMap) {

    // Poistetaan aikaisempi valinta
    if (selectedStallNumber !== null) {

        const previousElement = stallElements.get(selectedStallNumber);

        if (previousElement) {
            previousElement.classList.remove("koju-highlight");
        }

        const previousMarker = markers.get(selectedStallNumber);

        if (previousMarker) {
            previousMarker.setZIndexOffset(0);

            const previousIcon = previousMarker.getElement();

            if (previousIcon) {
                previousIcon.classList.remove("marker-highlight");
            }
        }
    }

    // Tallennetaan uusi valinta
    selectedStallNumber = number;

    const selectedElement = stallElements.get(number);
    const selectedMarker = markers.get(number);

    if (!selectedElement || !selectedMarker) {
        return;
    }

    // Korostetaan kojulistan elementti
    selectedElement.classList.add("koju-highlight");

    // Korostetaan karttamerkki
    selectedMarker.setZIndexOffset(1000);

    const selectedIcon = selectedMarker.getElement();

    if (selectedIcon) {
        selectedIcon.classList.add("marker-highlight");
    }

    // Siirretään kartta kojun kohdalle tarvittaessa
    if (moveMap) {
        map.setView(selectedMarker.getLatLng(), 19, {
            animate: true
        });

        selectedMarker.openPopup();
    }

    // Vieritetään valittu koju näkyviin listassa
    selectedElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}


function createParkingAreas(parkit) {

    parkit.forEach(function (area) {

        const coordinates = area.coordinates.map(function (corner) {
            return [
                corner.lat,
                corner.lng
            ];
        });

        const parkingArea = L.polygon(coordinates, {
            color: "#2673b8",
            fillColor: "#398bd1",
            fillOpacity: 0.25,
            weight: 2
        }).addTo(map);

        // Luodaan pysäköintialueen tiedot
        const popupContent = document.createElement("div");

        const title = document.createElement("strong");
        title.textContent = area.name;

        const entrance = document.createElement("p");
        entrance.textContent = "Sisäänkäynti: " + (area.entrance || "Ei määritetty");

        const exit = document.createElement("p");
        exit.textContent = "Uloskäynti: " + (area.exit || "Ei määritetty");

        popupContent.append(title, entrance, exit);

        parkingArea.bindPopup(popupContent, {
            autoPan: false
        });

    });
}


function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

loadPlan();


const searchInput = document.getElementById("haku");

searchInput.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase().trim();
    const joo = document.querySelectorAll(".koju");

    joo.forEach(joo => {
        const number = joo.querySelector("p").textContent.toLowerCase();
        const title = joo.querySelector("h3").textContent.toLowerCase();

        const searchText = number + " " + title;

        if (searchText.includes(searchValue)) {
            joo.style.display = "";
        } else {
            joo.style.display = "none";
        }
    });
});
