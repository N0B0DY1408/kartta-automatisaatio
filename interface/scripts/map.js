//itse kartan tuonti ja sitten mihin kartta oletukuksena keskittyy
var map = L.map('map', {rotate: true, bearing: 135}).setView([63.524705, 24.666208], 17); 

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

//tehdään kartalle markkerereita joita käyttäjä voi lisätä klikkaamalla karttaa
const markersSection = document.getElementById("markers");

let kojuPlacementEnabled = true;

let kojumäärä = 1;

const kojut = new Map();

map.on('click', function (event){

    const target = event.originalEvent.target;

    if (
        target.closest(".leaflet-interactive") ||
        target.closest(".leaflet-pm-toolbar")
    ) {
        return;
    }

    if (!kojuPlacementEnabled) {
        return;
    }

    const Kojunimi = prompt("kojun nimi")

    if (!Kojunimi || !Kojunimi.trim()){
        return;
    }

    const kojunumero = kojumäärä++;

    const sijainti = event.latlng;

    const marker = L.marker(sijainti).addTo(map);

    const popupcontent = document.createElement("div");

    const popuptitle = document.createElement("strong");
    popuptitle.textContent = `koju #${kojunumero}`;

    const popupname = document.createElement("p");
    popupname.textContent = Kojunimi.trim();

    popupcontent.append(popuptitle, popupname);

    marker.bindPopup(popupcontent);

    //sitten tehdään jokaiselle markkerille oma div elementti joka lisätään hmtl:ään
    const kojudiv = document.createElement("div");
    kojudiv.className = "koju";

    const numero = document.createElement("h3");
    numero.textContent = `koju #${kojunumero}`;

    const nimiDisplay = document.createElement("p");
    nimiDisplay.textContent = Kojunimi.trim();

    const sijaintiP = document.createElement("p");
    sijaintiP.textContent = `sijainti: ${sijainti.lat.toFixed(5)}, ${sijainti.lng.toFixed(5)}`;

    const kojuData = {
    number: kojunumero,
    name: Kojunimi.trim(),
    coordinates: sijainti,
    marker: marker,
    element: kojudiv
};

    kojut.set(kojunumero, kojuData);

    function updatekojuLocation() {
    const uusiSijainti = marker.getLatLng();

        kojuData.coordinates = uusiSijainti;

        sijaintiP.textContent =
            `sijainti: ${uusiSijainti.lat.toFixed(5)}, ${uusiSijainti.lng.toFixed(5)}`;

        console.log("Kojun uusi sijainti:", kojuData.coordinates);
    }

    marker.on("pm:dragend", updatekojuLocation);

    marker.on("dragend", updatekojuLocation);


    //muokkausnappi ja sen toiminnallisuus
    const muokkaanappi = document.createElement("button");
    muokkaanappi.textContent = "Muokkaa";

    muokkaanappi.addEventListener("click", function () {

        // Luodaan tekstikenttä nykyisellä nimellä
        const nimiInput = document.createElement("input");
        nimiInput.type = "text";
        nimiInput.value = kojuData.name;
        nimiInput.placeholder = "Kojun nimi";

        // Tallennusnappi
        const tallennaNappi = document.createElement("button");
        tallennaNappi.textContent = "Tallenna";

        // Muokkauksen lopetusnappi
        const lopetusnappi = document.createElement("button");
        lopetusnappi.textContent = "Lopeta muokkaus";

        const editControls = document.createElement("div");
        editControls.append(tallennaNappi, lopetusnappi);

        // Vaihdetaan nimi tekstikentäksi
        nimiDisplay.replaceWith(nimiInput);
        muokkaanappi.hidden = true;

        // Yhteinen muokkaustilan lopetusfunktio
        function lopetaMuokkaus() {
            nimiInput.replaceWith(nimiDisplay);
            editControls.remove();
            muokkaanappi.hidden = false;
        }

        // Tallennetaan muutokset
        tallennaNappi.addEventListener("click", function () {

            // Jos kenttä on tyhjä, säilytetään vanha nimi
            const uusiNimi = nimiInput.value.trim() || kojuData.name;

            // Päivitetään tiedot
            kojuData.name = uusiNimi;
            nimiDisplay.textContent = uusiNimi;
            popupname.textContent = uusiNimi;

            // Poistutaan muokkaustilasta
            lopetaMuokkaus();
        });

        // Perutaan muutokset
        lopetusnappi.addEventListener("click", function () {
            lopetaMuokkaus();
        });

        nimiInput.after(editControls);
        nimiInput.focus();
    });

    //listään mahdollisuus poistaa marrkeri ja sen div elementti
    const poistaNappi = document.createElement("button");
    poistaNappi.textContent = "poista";

    poistaNappi.addEventListener("click", function (){

        map.removeLayer(marker);

        kojudiv.remove();

        kojut.delete(kojunumero);

    });

    kojudiv.append(numero, nimiDisplay, sijaintiP, muokkaanappi, poistaNappi);

    kojudiv.addEventListener("mouseenter", function () {
    marker.openPopup();
    });

    kojudiv.addEventListener("mouseleave", function () {
        marker.closePopup();
    });

    marker.on("mouseover", function () {
    kojudiv.classList.add("koju-highlight");
    });

    marker.on("mouseout", function () {
        kojudiv.classList.remove("koju-highlight");
    });

    markersSection.appendChild(kojudiv);

    console.log("Koju lisätty:", kojut.get(kojunumero));

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

    kojuPlacementEnabled = false;

    const rectangle = event.layer;
    rectangle.pm.setOptions({
        allowRotation: true,
        allowEditing: true,
        draggable: true
    });

    const areaNumber = parkingCounter++;

    // Pysäköintialueen tiedot
    const areaData = {
        number: areaNumber,
        name: `Pysäköintialue #${areaNumber}`,
        entrance: "",
        exit: "",
        layer: rectangle,
        element: null
    };

    // Tallennetaan tiedot
    parkit.set(areaNumber, areaData);

    // Suorakulmion ulkoasu
    rectangle.setStyle({
        color: "#3388ff",
        fillColor: "#3388ff",
        fillOpacity: 0.25,
        weight: 2
    });

    // Luodaan popup
    const popupContent = document.createElement("div");

    const popupTitle = document.createElement("strong");
    popupTitle.textContent = areaData.name;

    const popupEntrance = document.createElement("p");
    const popupExit = document.createElement("p");

    function updatePopup() {
        popupTitle.textContent = areaData.name;
        popupEntrance.textContent =
            `Sisäänkäynti: ${areaData.entrance || "Ei määritetty"}`;

        popupExit.textContent =
            `Uloskäynti: ${areaData.exit || "Ei määritetty"}`;
    }

    updatePopup();

    popupContent.append(
        popupTitle,
        popupEntrance,
        popupExit
    );

    rectangle.bindPopup(popupContent);


    // Luodaan HTML-elementti
    const areaDiv = document.createElement("div");
    areaDiv.className = "parkit";

    areaData.element = areaDiv;

    const title = document.createElement("h3");
    title.textContent = areaData.name;

    const entranceText = document.createElement("p");
    const exitText = document.createElement("p");

    function updateCard() {
        title.textContent = areaData.name;

        entranceText.textContent =
            `Sisäänkäynti: ${areaData.entrance || "Ei määritetty"}`;

        exitText.textContent =
            `Uloskäynti: ${areaData.exit || "Ei määritetty"}`;
    }

    updateCard();


    // Muokkausnappi
    const editButton = document.createElement("button");
    editButton.textContent = "Muokkaa";

    editButton.addEventListener("click", function () {

        const nameInput = document.createElement("input");
        nameInput.value = areaData.name;
        nameInput.placeholder = "Alueen nimi";

        const entranceInput = document.createElement("input");
        entranceInput.value = areaData.entrance;
        entranceInput.placeholder = "Sisäänkäynti";

        const exitInput = document.createElement("input");
        exitInput.value = areaData.exit;
        exitInput.placeholder = "Uloskäynti";

        const saveButton = document.createElement("button");
        saveButton.textContent = "Tallenna";

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Peruuta";

        const editControls = document.createElement("div");

        editControls.append(saveButton, cancelButton);

        title.replaceWith(nameInput);
        entranceText.replaceWith(entranceInput);
        exitText.replaceWith(exitInput);

        editButton.hidden = true;

        function finishEditing() {
            nameInput.replaceWith(title);
            entranceInput.replaceWith(entranceText);
            exitInput.replaceWith(exitText);

            editControls.remove();
            editButton.hidden = false;
        }

        saveButton.addEventListener("click", function () {

            areaData.name =
                nameInput.value.trim() || areaData.name;

            areaData.entrance =
                entranceInput.value.trim() || areaData.entrance;

            areaData.exit =
                exitInput.value.trim() || areaData.exit;

            updateCard();
            updatePopup();

            finishEditing();
        });

        cancelButton.addEventListener("click", function () {
            finishEditing();
        });

        exitInput.after(editControls);

        nameInput.focus();
    });


    // Poistonappi
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Poista alue";

    deleteButton.addEventListener("click", function () {

        map.removeLayer(rectangle);

        areaDiv.remove();

        parkit.delete(areaNumber);
    });


    // Yhdistetään kaikki HTML-elementit
    areaDiv.append(
        title,
        entranceText,
        exitText,
        editButton,
        deleteButton
    );

    parkingSection.appendChild(areaDiv);


    // Hover-toiminto
    areaDiv.addEventListener("mouseenter", function () {
        rectangle.openPopup();
    });

    areaDiv.addEventListener("mouseleave", function () {
        rectangle.closePopup();
    });

    console.log("Pysäköintialue lisätty:", areaData);
    kojuPlacementEnabled = true;
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