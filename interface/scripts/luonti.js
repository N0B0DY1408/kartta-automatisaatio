function luoKojunIkoni(vari = "#3388ff") {

    return L.divIcon({
        className: "koju-marker-icon",
        html: `
            <div style="
                width: 18px;
                height: 18px;
                background-color: ${vari};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 1px 4px rgba(0,0,0,0.5);
            "></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        popupAnchor: [0, -11]
    });
}

function luoKojunMarkkeri(koordinaatit, vari = "#3388ff") {

    return L.marker(koordinaatit, {
        icon: luoKojunIkoni(vari)
    });
}

function createKoju(number, name, coordinates) {

    const marker = luoKojunMarkkeri(coordinates);

    if (naytaKojutKartalla) {
        marker.addTo(map);
    }

    const popupContent = document.createElement("div");

    const popupTitle = document.createElement("strong");
    popupTitle.textContent = `Koju #${number}`;

    const popupName = document.createElement("p");
    popupName.textContent = name;

    popupContent.append(popupTitle, popupName);
    marker.bindPopup(popupContent);

    const kojuDiv = document.createElement("div");
    kojuDiv.className = "koju";

    const nameDisplay = document.createElement("h3");
    nameDisplay.textContent = name;

    const numberDisplay = document.createElement("p");
    numberDisplay.textContent = `Koju #${number}`;

    const alueNumeroDisplay = document.createElement("p");
    alueNumeroDisplay.textContent = "Alueen numero: -";

    const locationDisplay = document.createElement("p");

    const kojuData = {
        number: number,
        name: name,
        coordinates: coordinates,
        marker: marker,
        element: kojuDiv,
        alueId: null,
        alueTunnus: null,
        alueNumero: null,
        alueNumeroDisplay: alueNumeroDisplay,
    };

    kojut.set(number, kojuData);

    updateKojuCounter();

    function updateKojuLocation() {

        const newPosition = marker.getLatLng();

        kojuData.coordinates = newPosition;

        scheduleAutosave();
    }

    function updateKojuCounter() {
    const counter = document.getElementById("kojuCount");

    counter.textContent = kojut.size;
    }

    updateKojuLocation();
    paivitaKojunAlue(kojuData);

    marker.on("dragend", function () {
        updateKojuLocation();
        paivitaKojunAlue(kojuData);
    });

    marker.on("pm:dragend", function () {
        updateKojuLocation();
        paivitaKojunAlue(kojuData);
    });

    // Create the edit button
    const editButton = document.createElement("button");
    editButton.textContent = "Muokkaa";

    editButton.addEventListener("click", function () {

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = kojuData.name;
        nameInput.placeholder = "Kojun nimi";

        const saveButton = document.createElement("button");
        saveButton.textContent = "Tallenna";

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Lopeta muokkaus";

        const editControls = document.createElement("div");
        editControls.append(saveButton, cancelButton);

        nameDisplay.replaceWith(nameInput);
        editButton.hidden = true;

        function finishEditing() {
            nameInput.replaceWith(nameDisplay);
            editControls.remove();
            editButton.hidden = false;
        }

        saveButton.addEventListener("click", function () {

            const newName = nameInput.value.trim() || kojuData.name;

            kojuData.name = newName;
            nameDisplay.textContent = newName;
            popupName.textContent = newName;

            finishEditing();
        });

        cancelButton.addEventListener("click", finishEditing);

        nameInput.after(editControls);
        nameInput.focus();
    });

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Poista";

    deleteButton.addEventListener("click", function () {

        console.log("DELETE BUTTON CLICKED:", number);

        map.removeLayer(marker);
        kojuDiv.remove();

        kojut.delete(number);

        updateKojuCounter();

        console.log("paivitaAlueidenKojuNumerot käynnistyi");
        paivitaAlueidenKojuNumerot();
        console.log("Numerointi suoritettu poiston jälkeen:");

        console.log("Markers remaining in memory:", kojut.size);

        scheduleAutosave();
    });

    kojuDiv.append(
        numberDisplay,
        alueNumeroDisplay,
        nameDisplay,
        editButton,
        deleteButton
    );

    kojuDiv.addEventListener("mouseenter", function () {
        marker.openPopup();
    });

    kojuDiv.addEventListener("mouseleave", function () {
        marker.closePopup();
    });

    marker.on("mouseover", function () {
        kojuDiv.classList.add("koju-highlight");
    });

    marker.on("mouseout", function () {
        kojuDiv.classList.remove("koju-highlight");
    });

    console.log("Koju lisätty:", kojuData);

    scheduleAutosave();
}



function luoparkki(number, name, entrance, exit, layer = null, corners = null) {

    const parkingStyle = {
        color: "#3388ff",
        fillColor: "#3388ff",
        fillOpacity: 0.25,
        weight: 2
    };

    if (!layer) {
        layer = L.polygon(corners, parkingStyle);
    } else {
        layer.setStyle(parkingStyle);
    }

    if (naytaParkitKartalla) {
        layer.addTo(map);
    } else {
        map.removeLayer(layer);
    }

    if (layer.pm) {
        layer.pm.setOptions({
            allowRotation: true,
            allowEditing: true,
            draggable: true
        });
    }

    const areaData = {
        number: number,
        name: name,
        entrance: entrance || "",
        exit: exit || "",
        layer: layer,
        element: null
    };

    parkit.set(number, areaData);

    const popupContent = document.createElement("div");

    const popupTitle = document.createElement("strong");
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

    layer.bindPopup(popupContent);

    // Autosave when the parking area is edited
    layer.on("pm:edit", function () {
        scheduleAutosave();
    });

    // Autosave when the parking area is moved
    layer.on("pm:dragend", function () {
        scheduleAutosave();
    });

    // Autosave when the parking area is rotated
    layer.on("pm:rotateend", function () {
        scheduleAutosave();
    });

    const areaDiv = document.createElement("div");
    areaDiv.className = "parkit";

    areaData.element = areaDiv;

    const title = document.createElement("h3");
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
                entranceInput.value.trim();

            areaData.exit =
                exitInput.value.trim();

            updateCard();
            updatePopup();

            finishEditing();

            scheduleAutosave();
        });

        cancelButton.addEventListener("click", finishEditing);

        exitInput.after(editControls);
        nameInput.focus();
    });


    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Poista alue";

    deleteButton.addEventListener("click", function () {

        map.removeLayer(layer);
        areaDiv.remove();

        parkit.delete(number);

        scheduleAutosave();
    });

    areaDiv.append(
        title,
        entranceText,
        exitText,
        editButton,
        deleteButton
    );

    parkingSection.appendChild(areaDiv);

    areaDiv.addEventListener("mouseenter", function () {
        layer.openPopup();
    });

    areaDiv.addEventListener("mouseleave", function () {
        layer.closePopup();
    });

    console.log("Pysäköintialue lisätty:", areaData);

    return areaData;
}


function luoAlue(id, kirjain, vari, koordinaatit, layer = null) {

    if (!layer) {
        layer = L.polygon(koordinaatit);
    }

    layer.setStyle({
        color: vari,
        fillColor: vari,
        fillOpacity: 0.2,
        weight: 2
    });

    const alueData = {
        id: id,
        kirjain: kirjain,
        vari: vari,
        koordinaatit: koordinaatit,
        layer: layer,
        element: null
    };

    // Lisätään alue kartalle, jos alueiden näkymä on käytössä.
    if (naytaAlueetKartalla) {
        layer.addTo(map);
    }

    alueet.set(id, alueData);

    // Luodaan alueelle oma kojuryhmä tavalliseen näkymään.
    const kojuRyhmanDetails = document.createElement("details");
    kojuRyhmanDetails.className = "kojuAlueRyhmä";
    kojuRyhmanDetails.open = true;

    // Alueen otsikko, jota painamalla ryhmän voi avata tai sulkea.
    const kojuRyhmanOtsikko = document.createElement("summary");
    kojuRyhmanOtsikko.textContent = `Alue ${kirjain}`;

    // Säiliö alueen kojujen korteille.
    const kojuLista = document.createElement("div");
    kojuLista.className = "kojuAlueLista";

    kojuRyhmanDetails.append(
        kojuRyhmanOtsikko,
        kojuLista
    );

    // Tallennetaan kojusäiliö alueen tietoihin.
    alueData.kojuRyhmanElement = kojuRyhmanDetails;
    alueData.kojuListaElement = kojuLista;

    // Lisätään ryhmä sivupaneeliin.
    document.getElementById("kojuAlueRyhmaContainer")
        .appendChild(kojuRyhmanDetails);

    // Luodaan alueelle oma elementti sivupaneeliin.
    const alueDiv = document.createElement("div");
    alueDiv.className = "alue";

    alueData.element = alueDiv;

    const otsikko = document.createElement("h3");
    otsikko.textContent = `Alue ${kirjain}`;

    const variTieto = document.createElement("p");
    variTieto.textContent = `Väri: ${vari}`;

    const kojuMaara = document.createElement("p");
    kojuMaara.className = "alueKojuMaara";
    kojuMaara.textContent = "Kojut: 0 kpl";

    alueData.kojuMaaraElement = kojuMaara;

    
    const variNayte = document.createElement("button");
    variNayte.className = "alueVariNayte";
    variNayte.type = "button";
    variNayte.title = "Vaihda alueen väri";
    

    variNayte.style.backgroundColor = vari;

    const variValitsin = document.createElement("input");
    variValitsin.type = "color";
    variValitsin.value = vari;
    variValitsin.style.display = "none";

    // Avataan värivalitsin värinäytettä painamalla.
    variNayte.addEventListener("click", function () {
        variValitsin.click();
    });

    // Päivitetään alueen väri valinnan jälkeen.
    variValitsin.addEventListener("input", function () {

        const uusiVari = variValitsin.value;

        // Päivitetään alueen tiedot.
        alueData.vari = uusiVari;

        // Päivitetään karttapolygonin väri.
        layer.setStyle({
            color: uusiVari,
            fillColor: uusiVari
        });

        // Päivitetään sivupaneelin värinäyte.
        variNayte.style.backgroundColor = uusiVari;

        // Päivitetään värin tekstimuotoinen tieto.
        variTieto.textContent = `Väri: ${uusiVari}`;

        // Päivitetään alueella olevien kojujen värit.
        kojut.forEach(function (koju) {
            if (koju.alueId === alueData.id) {
                paivitaKojunAlue(koju);
            }
        });

        scheduleAutosave();
    });


    const poistaButton = document.createElement("button");
    poistaButton.textContent = "Poista alue";

    poistaButton.addEventListener("click", function () {

        // Lopetetaan alueiden piirtäminen ennen poistamista.
        if (alueidenPiirtoKaynnissa) {
            vaihdaAlueidenPiirtotila();
        }

        map.removeLayer(layer);

        alueDiv.remove();

        alueet.delete(id);

        scheduleAutosave();
    });

    alueDiv.append(
        otsikko,
        kojuMaara,
        variTieto,
        variNayte,
        variValitsin,
        poistaButton
    );

    document.getElementById("alueLista").appendChild(alueDiv);

    // Alueen korostaminen kartalla sivupaneelin kautta.
    alueDiv.addEventListener("mouseenter", function () {
        layer.openPopup();
    });

    alueDiv.addEventListener("mouseleave", function () {
        layer.closePopup();
    });

    // Tarkistetaan kaikkien olemassa olevien kojujen alueet.
    kojut.forEach(function (koju) {
        paivitaKojunAlue(koju);
    });

    scheduleAutosave();

    return alueData;
}


function etsiAlueKoordinaateilla(koordinaatit) {

    let loydettyAlue = null;

    alueet.forEach(function (alue) {

        const pisteet = alue.koordinaatit;

        let sisalla = false;

        for (
            let i = 0, j = pisteet.length - 1;
            i < pisteet.length;
            j = i++
        ) {

            const xi = pisteet[i].lng;
            const yi = pisteet[i].lat;

            const xj = pisteet[j].lng;
            const yj = pisteet[j].lat;

            const leikkaa =
                ((yi > koordinaatit.lat) !== (yj > koordinaatit.lat)) &&
                (
                    koordinaatit.lng <
                    (xj - xi) *
                    (koordinaatit.lat - yi) /
                    (yj - yi) + xi
                );

            if (leikkaa) {
                sisalla = !sisalla;
            }
        }

        if (sisalla) {
            loydettyAlue = alue;
        }

    });

    return loydettyAlue;
}

function siirraKojuOikeaanRyhmään(kojuData) {

    let kohdeLista;

    if (kojuData.alueId) {

        const alue = alueet.get(kojuData.alueId);

        if (alue && alue.kojuListaElement) {
            kohdeLista = alue.kojuListaElement;
        }

    } else {
        kohdeLista = document.getElementById("alueettomatKojutLista");
    }

    if (kohdeLista) {
        kohdeLista.appendChild(kojuData.element);
    }
}

function paivitaKojunAlue(kojuData) {

    const loydettyAlue = etsiAlueKoordinaateilla(
        kojuData.marker.getLatLng()
    );

    if (loydettyAlue) {
        kojuData.alueId = loydettyAlue.id;
        kojuData.alueTunnus = loydettyAlue.kirjain;

        // Vaihdetaan markkerin väri alueen väriksi.
        kojuData.marker.setIcon(
            luoKojunIkoni(loydettyAlue.vari)
        );

    } else {
        kojuData.alueId = null;
        kojuData.alueTunnus = null;

        // Palautetaan oletusväri.
        kojuData.marker.setIcon(
            luoKojunIkoni("#3388ff")
        );
    }

    siirraKojuOikeaanRyhmään(kojuData);

    paivitaAlueidenKojuNumerot();
}

function paivitaAlueidenKojuNumerot() {

    kojut.forEach(function (koju) {
    koju.alueNumero = null;

        if (koju.alueNumeroDisplay) {
            koju.alueNumeroDisplay.textContent = "Alueen numero: -";
        }

        if (koju.alueNumeroTooltip) {
            koju.alueNumeroTooltip.textContent = "-";
        }
    });

    alueet.forEach(function (alue) {

        // Haetaan kaikki tähän alueeseen kuuluvat kojut.
        const alueenKojut = Array.from(kojut.values())
            .filter(function (koju) {
                return koju.alueId === alue.id;
            });

        // Järjestetään kojut pysyvän numeron perusteella.
        alueenKojut.sort(function (a, b) {
            return a.number - b.number;
        });

        // Annetaan alueen kojuille numerot 1, 2, 3...
        alueenKojut.forEach(function (koju, index) {

            koju.alueNumero = index + 1;

            if (koju.alueNumeroDisplay) {
                koju.alueNumeroDisplay.textContent =
                    `Alue ${alue.kirjain} / Koju #${koju.alueNumero}`;
            }

            if (koju.alueNumeroTooltip) {
                koju.alueNumeroTooltip.textContent =
                    `Alue ${alue.kirjain} / ${koju.alueNumero}`;
            }
        });

    });

    // Päivitetään myös alueiden kojumäärät.
    paivitaAlueidenKojuMaarat();
}

window.paivitaAlueidenKojuNumerot = paivitaAlueidenKojuNumerot;

window.testaaAlueenTunnistus = function () {

    alueet.forEach(function (alue) {

        const keskipiste = alue.layer.getBounds().getCenter();

        const loydetty = etsiAlueKoordinaateilla(keskipiste);

        console.log(
            `Alue ${alue.kirjain}:`,
            loydetty ? loydetty.kirjain : "Ei tunnistettu"
        );

    });

    // Tarkistetaan kaikkien olemassa olevien kojujen alueet.
    kojut.forEach(function (koju) {
        paivitaKojunAlue(koju);
    });

};


function paivitaAlueidenKojuMaarat() {

    alueet.forEach(function (alue) {

        let maara = 0;

        kojut.forEach(function (koju) {

            if (koju.alueId === alue.id) {
                maara++;
            }

        });

        if (alue.kojuMaaraElement) {
            alue.kojuMaaraElement.textContent =
                `Kojut: ${maara} kpl`;
        }

    });

}
