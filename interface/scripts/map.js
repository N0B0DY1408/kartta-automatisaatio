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

// Karttatasojen näkyvyysasetukset
let naytaAlueetKartalla = false;
let naytaKojutKartalla = true;
let naytaParkitKartalla = true;

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

// Lopettaa alueiden piirtämisen
function lopetaAlueidenPiirtotila() {

    if (!alueidenPiirtoKaynnissa) {
        return;
    }

    map.pm.disableDraw();

    alueidenPiirtoKaynnissa = false;

    console.log("Alueiden piirtotila pois käytöstä");
}


// Vaihtaa alueiden piirtotilan päälle tai pois
function vaihdaAlueidenPiirtotila() {

    if (alueidenPiirtoKaynnissa) {

        lopetaAlueidenPiirtotila();

    } else {

        // Poistetaan muut mahdolliset piirtotyökalut käytöstä.
        map.pm.disableDraw();

        // Aktivoidaan alueiden piirtäminen.
        map.pm.enableDraw("Polygon", {
            snappable: true,
            continueDrawing: true
        });

        alueidenPiirtoKaynnissa = true;

        console.log("Alueiden piirtotila käytössä");
    }
}

let kojuPlacementEnabled = true;

let kojupaikkaMaara = 1;
const kojupaikat = new Map();

let valittuKojupaikka = null;

map.on("click", async function(event) {

    // Ei luoda uutta kojupaikkaa, jos klikattiin olemassa olevaa karttakohdetta.
    if (
        event.originalEvent?.target?.closest(".leaflet-interactive")
    ) {
        return;
    }

    if (Number(kytkin.value) === 1) return;
    if (!kojuPlacementEnabled) return;
    if (map.pm.globalRotateModeEnabled()) return;
    if (map.pm.globalEditModeEnabled()) return;
    if (map.pm.globalDragModeEnabled()) return;
    if (map.pm.globalRemovalModeEnabled()) return;

    const paikkaNumber = kojupaikkaMaara++;

    luoKojupaikka(
        paikkaNumber,
        event.latlng
    );
});

const parkingSection = document.getElementById("parkit");

let parkingCounter = 1;

const parkit = new Map();


// Kun käyttäjä piirtää uuden muodon
map.on("pm:create", function (event) {

    const layer = event.layer;

    // Jos alueiden piirtotila on päällä,
    // käsitellään piirretty muoto alueena.
   if (alueidenPiirtoKaynnissa) {

        // Etsitään seuraava vapaa alueen tunniste.
        while (alueet.has(`alue-${alueCounter}`)) {
            alueCounter++;
        }

        const kirjain = String.fromCharCode(64 + alueCounter);
        const id = `alue-${alueCounter}`;

        const koordinaatit = layer.getLatLngs()[0];

        luoAlue(
            id,
            kirjain,
            "#2878C8",
            koordinaatit,
            layer
        );

        alueCounter++;

        return;
    }

    // Muussa tapauksessa käsitellään se pysäköintialueena.
    luoparkki(
        parkingCounter,
        `Pysäköintialue #${parkingCounter}`,
        "",
        "",
        layer
    );

    parkingCounter++;

});

const alueet = new Map();

let alueidenPiirtoKaynnissa = false;
let alueCounter = 1;

// Alueiden näyttäminen ja piilottaminen
function naytaAlueet(nakyvissa) {

    naytaAlueetKartalla = nakyvissa;

    alueet.forEach(function (alue) {

        if (nakyvissa) {
            alue.layer.addTo(map);
        } else {
            map.removeLayer(alue.layer);
        }

    });

}

// Fyysisten kojupaikkojen näyttäminen ja piilottaminen.
function naytaKojut(nakyvissa) {

    naytaKojutKartalla = nakyvissa;

    kojupaikat.forEach(function (paikka) {

        if (nakyvissa) {
            paikka.layer.addTo(map);
        } else {
            map.removeLayer(paikka.layer);
        }

    });

}

// Parkkipaikkojen näyttäminen ja piilottaminen
function naytaParkit(nakyvissa) {

    naytaParkitKartalla = nakyvissa;

    parkit.forEach(function (parkki) {

        if (nakyvissa) {
            parkki.layer.addTo(map);
        } else {
            map.removeLayer(parkki.layer);
        }

    });

} 


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