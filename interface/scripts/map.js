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

//tehdään kartalle markkerereita joita käyttäjä voi lisätä klikkaamalla karttaa
const markersSection = document.getElementById("markers");

let kojuPlacementEnabled = true;

let kojumäärä = 1;

const kojut = new Map();

map.on("click", function (event) {

    if (!kojuPlacementEnabled) return;

    if (map.pm.globalRotateModeEnabled()) return;
    if (map.pm.globalEditModeEnabled()) return;
    if (map.pm.globalDragModeEnabled()) return;
    if (map.pm.globalRemovalModeEnabled()) return;


    const kojuName = prompt("Kojun nimi");

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

const parkingSection = document.getElementById("parkit");

let parkingCounter = 1;

const parkit = new Map();

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
    removalMode: true,

    cutPolygon: false,
    rotateMode: true
});


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