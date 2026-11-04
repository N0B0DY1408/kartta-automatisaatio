
function createKoju(number, name, coordinates) {

    const marker = L.marker(coordinates).addTo(map);

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

    function updateKojuLocation() {

        const newPosition = marker.getLatLng();

        kojuData.coordinates = newPosition;

        locationDisplay.textContent =
            `sijainti: ${newPosition.lat.toFixed(5)}, ${newPosition.lng.toFixed(5)}`;

        scheduleAutosave();
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
        layer = L.polygon(corners, parkingStyle).addTo(map);
    } else {
        layer.setStyle(parkingStyle);
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
