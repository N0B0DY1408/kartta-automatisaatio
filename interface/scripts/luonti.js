
function createKoju(number, name, coordinates) {

    const marker = L.marker(coordinates);

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

    const locationDisplay = document.createElement("p");

    const kojuData = {
        number: number,
        name: name,
        coordinates: coordinates,
        marker: marker,
        element: kojuDiv
    };

    kojut.set(number, kojuData);

    updateKojuCounter();

    function updateKojuLocation() {

        const newPosition = marker.getLatLng();

        kojuData.coordinates = newPosition;

        locationDisplay.textContent =
            `sijainti: ${newPosition.lat.toFixed(5)}, ${newPosition.lng.toFixed(5)}`;

        scheduleAutosave();
    }

    function updateKojuCounter() {
    const counter = document.getElementById("kojuCount");

    counter.textContent = kojut.size;
    }

    updateKojuLocation();

    marker.on("dragend", updateKojuLocation);
    marker.on("pm:dragend", updateKojuLocation);

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

        console.log("Markers remaining in memory:", kojut.size);

        scheduleAutosave();
    });

    kojuDiv.append(
        numberDisplay,
        nameDisplay,
        locationDisplay,
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

    markersSection.appendChild(kojuDiv);

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

    // Luodaan alueelle oma elementti sivupaneeliin.
    const alueDiv = document.createElement("div");
    alueDiv.className = "alue";

    alueData.element = alueDiv;

    const otsikko = document.createElement("h3");
    otsikko.textContent = `Alue ${kirjain}`;

    const variTieto = document.createElement("p");
    variTieto.textContent = `Väri: ${vari}`;

    
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

    scheduleAutosave();

    return alueData;
}
