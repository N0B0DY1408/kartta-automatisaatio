//itse kartan tuonti ja sitten mihin kartta oletukuksena keskittyy
var map = L.map('map', {rotate: true, bearing: 135}).setView([63.524705, 24.666208], 17); 

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

map.on("moveend", function () {
    scheduleAutosave();
});

map.on("zoomend", function () {
    scheduleAutosave();
});

// Lisätään Geomanin piirtotyökalut kartalle
map.pm.addControls({
    position: "topleft",

    drawMarker: false,
    drawCircle: false,
    drawCircleMarker: false,
    drawPolyline: false,
    drawPolygon: false,

    drawRectangle: true,

    editMode: true,
    dragMode: true,
    removalMode: false,

    cutPolygon: false,
    rotateMode: true
});

//tehdään kartalle markkerereita joita käyttäjä voi lisätä klikkaamalla karttaa
const markersSection = document.getElementById("markers");

let kojuPlacementEnabled = true;

let kojumäärä = 1;

const kojut = new Map();

map.on("click", async function (event) {

    if (!kojuPlacementEnabled) return;

    if (map.pm.globalRotateModeEnabled()) return;
    if (map.pm.globalEditModeEnabled()) return;
    if (map.pm.globalDragModeEnabled()) return;
    if (map.pm.globalRemovalModeEnabled()) return;

    const kojuName = await kysyKojuNimi();

    if (!kojuName) return;

    if (!kojuName || !kojuName.trim()) {
        return;
    }

    const kojuNumber = kojumäärä++;

    createKoju(
        kojuNumber,
        kojuName.trim(),
        event.latlng
    );

});


function kysyKojuNimi() {
    return new Promise(function (resolve) {
        const dialog = document.getElementById("kojuDialog");
        const input = document.getElementById("kojuNameInput");

        input.value = "";

        dialog.addEventListener("close", function () {
            if (dialog.returnValue === "create") {
                const name = input.value.trim();
                resolve(name || null);
            } else {
                resolve(null);
            }
        }, { once: true });

        dialog.showModal();
        input.focus();
    });
}

const parkingSection = document.getElementById("parkit");

let parkingCounter = 1;

const parkit = new Map();


// Kun käyttäjä piirtää uuden suorakulmion
map.on("pm:create", function (event) {

    const rectangle = event.layer;

    luoparkki(
        parkingCounter,
        `Pysäköintialue #${parkingCounter}`,
        "",
        "",
        rectangle
    );

    parkingCounter++;

});


map.on("pm:drawstart", function () {
    kojuPlacementEnabled = false;
});

map.on("pm:drawend", function () {
    kojuPlacementEnabled = true;
});

map.on("pm:globalrotatemodetoggled", function (event) {
    kojuPlacementEnabled = !event.enabled;
});

map.on("pm:globaldragmodetoggled", function (event) {
    kojuPlacementEnabled = !event.enabled;
});

map.on("pm:globaleditmodetoggled", function (event) {
    kojuPlacementEnabled = !event.enabled;
});

map.on("pm:globalremovalmodetoggled", function (event) {
    kojuPlacementEnabled = !event.enabled;
});

map.on("pm:globalcancel", function () {
    kojuPlacementEnabled = true;
});