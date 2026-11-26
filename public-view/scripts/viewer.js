console.log("VIEWER.JS UUSI VERSIO 16.11.2026");

let map;
let stalls = new Map();
let stallElements = new Map();
let lastPlanJson = null;
let refreshInterval = null;

let selectedStallId = null;

async function loadPlan() {

    try {

        const response = await fetch(
            "https://kartta-julkaisupalvelu.tuikkamatias.workers.dev/plan",
            {
                cache: "no-store"
            }
        );

        console.log("JSON-vastaus:", response.status);
        console.log("JSON-tiedoston osoite:", response.url);

        if (!response.ok) {
            throw new Error(
                `JSON-tiedoston lataaminen epäonnistui. HTTP ${response.status}`
            );
        }

        const plan = await response.json();

        console.log("Ladattu suunnitelma:", plan);

        if (!plan || typeof plan !== "object") {
            throw new Error("Suunnitelma puuttuu tai ei ole objekti.");
        }

        if (!plan.map) {
            throw new Error("Suunnitelmasta puuttuu map-osio.");
        }

        if (!plan.map.center) {
            throw new Error("Suunnitelmasta puuttuu kartan keskipiste.");
        }

        if (!Array.isArray(plan.kojupaikat)) {
            throw new Error("Suunnitelman kojupaikat eivät ole taulukko.");
        }

        // Tarkistetaan, onko suunnitelma muuttunut.
        const currentPlanJson = JSON.stringify(plan);

        if (currentPlanJson === lastPlanJson) {
            console.log("Suunnitelma ei ole muuttunut.");
            return;
        }

        // Tallennetaan uuden suunnitelman sisältö vertailua varten.
        lastPlanJson = currentPlanJson;

        // Tyhjennetään vanhat karttamerkit ja valinnat.
        stalls.clear();
        stallElements.clear();
        selectedStallId = null;

        // Päivitetään sivun sisältö.
        document.getElementById("eventName").textContent = plan.name;

        createMap(plan);
        createStallList(plan.kojupaikat);
        createParkingAreas(plan.parkit || []);

        console.log("Kartta päivitettiin uudella suunnitelmalla.");

    } catch (error) {

        console.error("Kartan lataaminen epäonnistui:", error);

        document.getElementById("stallList").textContent =
            "Virhe: " + error.message;

    }
}



function createMap(plan) {

    // Poistetaan mahdollinen aikaisempi Leaflet-kartta.
    if (map) {
        map.remove();
        map = null;
    }

    const mapContainer = document.getElementById("map");

    // Varmistetaan, ettei karttaelementissä ole vanhaa Leaflet-tilaa.
    if (mapContainer._leaflet_id) {
        delete mapContainer._leaflet_id;
    }

    const center = [
        plan.map.center.lat,
        plan.map.center.lng
    ];

    map = L.map(mapContainer).setView(center, plan.map.zoom);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    plan.kojupaikat.forEach(function (paikka) {

        const coordinates = paikka.coordinates.map(function (corner) {
            return [
                corner.lat,
                corner.lng
            ];
        });

        // Luodaan ponnahdusikkunan sisältö.
        const popupContent = document.createElement("div");

        const popupTitle = document.createElement("strong");
        popupTitle.textContent = `Kojupaikka #${paikka.number}`;

        popupContent.append(popupTitle);

        const stall = L.polygon(coordinates, {
            color: "#3388ff",
            weight: 2,
            fillColor: "#3388ff",
            fillOpacity: 0.35
        }).addTo(map);

        stall.bindPopup(popupContent, {
            autoPan: false
        });

        // Tallennetaan kojupaikka pysyvän tunnisteen avulla.
        stalls.set(paikka.id, stall);

        // Kun kojupaikkaa painetaan, valitaan vastaava paikka listasta.
        stall.on("click", function () {
            selectStall(paikka.id, true);
        });

    });
}


function createStallList(kojupaikat) {

    const list = document.getElementById("stallList");

    list.innerHTML = "";

    // Tyhjennetään myös vanhat elementtiviittaukset
    stallElements.clear();

    kojupaikat.forEach(function (paikka) {

        const kojuDiv = document.createElement("div");
        kojuDiv.className = "koju";

        const title = document.createElement("h3");
        title.textContent = `Kojupaikka #${paikka.number}`;

        kojuDiv.append(title);

        // Tallennetaan HTML-elementti kojun numerolla
        stallElements.set(paikka.id, kojuDiv);

        // Kun listan kojua painetaan, valitaan se kartalta
        kojuDiv.addEventListener("click", function () {
            selectStall(paikka.id, true);
        });

        list.appendChild(kojuDiv);

    });
}


function selectStall(id, moveMap) {

    // Poistetaan aikaisempi valinta.
    if (selectedStallId !== null) {

        const previousElement = stallElements.get(selectedStallId);

        if (previousElement) {
            previousElement.classList.remove("koju-highlight");
        }

        const previousStall = stalls.get(selectedStallId);

        if (previousStall) {
            previousStall.setStyle({
                color: "#3388ff",
                weight: 2,
                fillColor: "#3388ff",
                fillOpacity: 0.35
            });
        }
    }

    // Tallennetaan uuden kojupaikan tunniste.
    selectedStallId = id;

    const selectedElement = stallElements.get(id);
    const selectedStall = stalls.get(id);

    if (!selectedElement || !selectedStall) {
        return;
    }

    // Korostetaan sivupaneelin kojupaikka.
    selectedElement.classList.add("koju-highlight");

    // Korostetaan kartan suorakulmio.
    selectedStall.setStyle({
        color: "#ffcc00",
        weight: 4,
        fillColor: "#ffcc00",
        fillOpacity: 0.5
    });

    selectedStall.bringToFront();

    // Siirretään kartta valitun kojupaikan kohdalle.
    if (moveMap) {

        map.setView(
            selectedStall.getBounds().getCenter(),
            19,
            {
                animate: true
            }
        );

        selectedStall.openPopup();
    }

    // Vieritetään valittu kojupaikka näkyviin listassa.
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

// Ladataan suunnitelma heti sivun avautuessa
loadPlan();

// Tarkistetaan uudet julkaisut 30 sekunnin välein
refreshInterval = setInterval(function () {
    loadPlan();
}, 30000);


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
