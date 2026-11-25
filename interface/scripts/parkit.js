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
            draggable: true,

            // Näytetään polygonin keskellä olevat lisäyspisteet.
            hideMiddleMarkers: false,

            // Uusi kulmapiste lisätään reunaa klikkaamalla.
            addVertexOn: "click",

            // Kulmapisteen voi poistaa hiiren oikealla painikkeella.
            removeVertexOn: "contextmenu"
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