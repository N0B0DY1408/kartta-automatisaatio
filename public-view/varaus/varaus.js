
// =================================
// VARAUSNÄKYMÄN ELEMENTIT
// =================================

const accessSection = document.getElementById("accessSection");
const reservationSection = document.getElementById("reservationSection");
const confirmationSection = document.getElementById("confirmationSection");

const accessButton = document.getElementById("accessButton");

const reservationForm = document.getElementById("reservationForm");

let selectedStallNumber = null;


// =================================
// VARAUSKOODIN TARKISTAMINEN
// =================================

const workerUrl =
    "https://kartta-julkaisupalvelu.tuikkamatias.workers.dev";

accessButton.addEventListener("click", async function () {

    const accessCode = document.getElementById(
        "reservationAccessCode"
    ).value.trim();

    if (!accessCode) {
        alert("Syötä ensin varauskoodi.");
        return;
    }

    accessButton.disabled = true;
    accessButton.textContent = "Tarkistetaan...";

    try {

        // Haetaan julkaistun suunnitelman tunniste.
        const planResponse = await fetch(
            `${workerUrl}/plan`,
            { cache: "no-store" }
        );

        if (!planResponse.ok) {
            throw new Error("Julkaistua suunnitelmaa ei löytynyt.");
        }

        const plan = await planResponse.json();

        if (!plan.id) {
            throw new Error("Suunnitelman tunniste puuttuu.");
        }

        // Tarkistetaan varauskoodi Workerilta.
        const accessResponse = await fetch(
            `${workerUrl}/reservation/access`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    planId: plan.id,
                    code: accessCode
                })
            }
        );

        const result = await accessResponse.json();

        if (!accessResponse.ok) {
            throw new Error(
                result.error || "Varauskoodin tarkistaminen epäonnistui."
            );
        }

        // Varauskoodi hyväksyttiin.
        accessSection.hidden = true;
        reservationSection.hidden = false;

        // Ladataan varauskartta.
        await loadReservationPlan();

    } catch (error) {

        console.error("Varauskoodin tarkistus epäonnistui:", error);

        alert(error.message);

    } finally {

        accessButton.disabled = false;
        accessButton.textContent = "Jatka";

    }

});

// =================================
// VARAUSLOMAKKEEN TESTIVAIHE
// =================================

reservationForm.addEventListener("submit", function (event) {

    event.preventDefault();

        // Tarkistetaan, että käyttäjä on valinnut kojupaikan.
        if (selectedStallId === null) {
            alert("Valitse ensin kojupaikka kartalta.");
            return;
        }

        // Kootaan valitun kojupaikan tiedot.
        const reservationData = {
            stallId: selectedStallId,
            stallNumber: selectedStallNumber
        };

        console.log("Varauspyynnön kojupaikka:", reservationData);

    // Piilotetaan varausnäkymä
    reservationSection.hidden = true;

    // Näytetään vahvistusnäkymä
    confirmationSection.hidden = false;

    // Näytetään vahvistusviesti
    document.getElementById("confirmationMessage").textContent =
        "Varauspyyntösi on vastaanotettu. " +
        "Varsinainen varauksen tallennus lisätään myöhemmin.";

});

// =================================
// KARTAN JA KOJUPAIKKOJEN TIEDOT
// =================================

let map = null;
let stalls = new Map();
let stallElements = new Map();
let selectedStallId = null;


// =================================
// JULKAISTUN SUUNNITELMAN LATAAMINEN
// =================================

async function loadReservationPlan() {

    try {

        const response = await fetch(
            "https://kartta-julkaisupalvelu.tuikkamatias.workers.dev/plan",
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Suunnitelman lataaminen epäonnistui.");
        }

        const plan = await response.json();

        if (!plan.map || !plan.map.center ||
            !Array.isArray(plan.kojupaikat)) {
            throw new Error("Suunnitelman tiedot eivät ole oikeassa muodossa.");
        }

        createReservationMap(plan);
        createReservationStallList(plan.kojupaikat);

    } catch (error) {

        console.error("Varauskartan lataaminen epäonnistui:", error);

        document.getElementById("stallDetails").textContent =
            "Kartan lataaminen epäonnistui: " + error.message;

    }

}

// =================================
// VARAUSKARTAN LUOMINEN
// =================================

function createReservationMap(plan) {

    if (map) {
        map.remove();
        map = null;
    }

    const mapContainer = document.getElementById("map");

    const center = [
        plan.map.center.lat,
        plan.map.center.lng
    ];

    map = L.map(mapContainer).setView(
        center,
        plan.map.zoom
    );

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

        const stall = L.polygon(coordinates, {
            color: "#3388ff",
            weight: 2,
            fillColor: "#3388ff",
            fillOpacity: 0.35
        }).addTo(map);

        const popupContent = document.createElement("div");

        const popupTitle = document.createElement("strong");
        popupTitle.textContent = `Kojupaikka #${paikka.number}`;

        popupContent.append(popupTitle);

        stall.bindPopup(popupContent);

        stalls.set(paikka.id, stall);

        stall.on("click", function () {
            selectReservationStall(paikka.id);
        });

    });

}

// =================================
// KOJUPAIKKOJEN LISTA
// =================================

function createReservationStallList(kojupaikat) {

    const list = document.getElementById("stallList");

    list.innerHTML = "";

    stallElements.clear();

    kojupaikat.forEach(function (paikka) {

        const kojuDiv = document.createElement("div");
        kojuDiv.className = "koju";

        const title = document.createElement("h3");
        title.textContent = `Kojupaikka #${paikka.number}`;

        kojuDiv.append(title);

        stallElements.set(paikka.id, kojuDiv);

        kojuDiv.addEventListener("click", function () {
            selectReservationStall(paikka.id);
        });

        list.appendChild(kojuDiv);

    });

}

// =================================
// KOJUPAIKAN VALINTA
// =================================

// =================================
// KOJUPAIKAN VALINTA
// =================================

function selectReservationStall(id) {

    const selectedElement = stallElements.get(id);
    const selectedStall = stalls.get(id);

    if (!selectedElement || !selectedStall) {
        return;
    }

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

    // Tallennetaan uusi valinta.
    selectedStallId = id;

    selectedStallNumber = Number(
        selectedElement.querySelector("h3").textContent.replace(
            "Kojupaikka #",
            ""
        )
    );

    // Korostetaan valittu kojupaikka.
    selectedElement.classList.add("koju-highlight");

    selectedStall.setStyle({
        color: "#ffcc00",
        weight: 4,
        fillColor: "#ffcc00",
        fillOpacity: 0.5
    });

    selectedStall.bringToFront();

    // Siirretään kartta valitun kojupaikan kohdalle.
    map.setView(
        selectedStall.getBounds().getCenter(),
        19,
        {
            animate: true
        }
    );

    selectedStall.openPopup();

    // Päivitetään tietopaneeli.
    document.getElementById("stallDetails").textContent =
        "Valittu kojupaikka: #" + selectedStallNumber;

}