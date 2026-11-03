const tallennusNappi = document.getElementById('tallenna');

tallennusNappi.addEventListener('click', function() {
    const suunnitelmanNimi = prompt('Anna suunnitelmalle nimi:');
    if (!suunnitelmanNimi || !suunnitelmanNimi.trim()) {
        return
    }

    const kojuData = Array.from(kojut.values()).map(function (koju) {

    const position = koju.marker.getLatLng();

    return {
        number: koju.number,
        name: koju.name,
        coordinates: {
            lat: position.lat,
            lng: position.lng
        }
    };
});

const parkingData = Array.from(parkit.values()).map(function (area) {

    const corners = area.layer.getLatLngs()[0];

    return {
        number: area.number,
        name: area.name,
        entrance: area.entrance,
        exit: area.exit,
        coordinates: corners.map(function (corner) {
            return {
                lat: corner.lat,
                lng: corner.lng
            };
        })
    };
});

const mapData = {
    center: {
        lat: map.getCenter().lat,
        lng: map.getCenter().lng
    },
    zoom: map.getZoom(),
    bearing: map.getBearing()
};

const planData = {
    version: 1,
    name: suunnitelmanNimi.trim(),
    kojut: kojuData,
    parkit: parkingData,
    map: mapData
};

const jsonData = JSON.stringify(planData, null, 4);

const file = new Blob(
    [jsonData],
    { type: "application/json" }
);

const downloadLink = document.createElement("a");

downloadLink.href = URL.createObjectURL(file);
downloadLink.download = suunnitelmanNimi.trim() + ".json";

downloadLink.click();

URL.revokeObjectURL(downloadLink.href);

console.log("Suunnitelma tallennettu:", planData);
});

function clearCurrentPlan() {

    for (const koju of kojut.values()) {
        map.removeLayer(koju.marker);
        koju.element.remove();
    }

    for (const area of parkit.values()) {
        map.removeLayer(area.layer);
        area.element.remove();
    }

    kojut.clear();
    parkit.clear();

    kojumäärä = 1;
    parkingCounter = 1;
}

const lataanappi = document.getElementById("Tuo");
const lataaInput = document.getElementById("TuoInput");

lataanappi.addEventListener("click", function () {
    lataaInput.click();
});

lataaInput.addEventListener("change", function () {

    const file = lataaInput.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {

        try {
            const planData = JSON.parse(event.target.result);

            if (
                planData.version !== 1 ||
                !Array.isArray(planData.kojut) ||
                !Array.isArray(planData.parkit) ||
                !planData.map
            ) {
                throw new Error("Valittu tiedosto ei toimi.");
            }

            clearCurrentPlan();

            planData.kojut.forEach(function (koju) {

                const position = L.latLng(
                    koju.coordinates.lat,
                    koju.coordinates.lng
                );

                const marker = L.marker(position, {
                    draggable: true
                }).addTo(map);

                const popupContent = document.createElement("div");
                const popupTitle = document.createElement("strong");
                const popupName = document.createElement("p");

                popupTitle.textContent = `Koju #${koju.number}`;
                popupName.textContent = koju.name;

                popupContent.append(popupTitle, popupName);
                marker.bindPopup(popupContent);

                const kojuDiv = document.createElement("div");
                kojuDiv.className = "koju";

                const number = document.createElement("h3");
                number.textContent = `Koju #${koju.number}`;

                const nameDisplay = document.createElement("p");
                nameDisplay.textContent = koju.name;

                const locationDisplay = document.createElement("p");

                function updatekojuLocation() {
                const newPosition = marker.getLatLng();

                locationDisplay.textContent =
                    `sijainti: ${newPosition.lat.toFixed(5)}, ${newPosition.lng.toFixed(5)}`;

                kojuData.coordinates = newPosition;
                }

                const kojuData = {
                    number: koju.number,
                    name: koju.name,
                    coordinates: position,
                    marker: marker,
                    element: kojuDiv
                };

                updatekojuLocation();

                marker.on("dragend", updatekojuLocation);
                marker.on("pm:dragend", updatekojuLocation);

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

                kojuDiv.append(number, nameDisplay, locationDisplay);
                markersSection.appendChild(kojuDiv);

                kojut.set(koju.number, kojuData);

                kojumäärä = Math.max(kojumäärä, koju.number + 1);
            });

            planData.parkit.forEach(function (area) {

                const corners = area.coordinates.map(function (corner) {
                    return L.latLng(corner.lat, corner.lng);
                });

                // A polygon made from the saved corners preserves rotation
                const rectangle = L.polygon(corners, {
                    color: "#3388ff",
                    fillColor: "#3388ff",
                    fillOpacity: 0.25,
                    weight: 2
                }).addTo(map);

                const areaDiv = document.createElement("div");
                areaDiv.className = "parkit";

                const title = document.createElement("h3");
                title.textContent = area.name;

                const entranceText = document.createElement("p");
                entranceText.textContent =
                    `Sisäänkäynti: ${area.entrance || "Ei määritetty"}`;

                const exitText = document.createElement("p");
                exitText.textContent =
                    `Uloskäynti: ${area.exit || "Ei määritetty"}`;

                const areaData = {
                    number: area.number,
                    name: area.name,
                    entrance: area.entrance,
                    exit: area.exit,
                    layer: rectangle,
                    element: areaDiv
                };

                rectangle.bindPopup(
                    `<strong>${area.name}</strong>`
                );

                areaDiv.addEventListener("mouseenter", function () {
                    rectangle.openPopup();
                });

                areaDiv.addEventListener("mouseleave", function () {
                    rectangle.closePopup();
                });

                areaDiv.append(title, entranceText, exitText);
                parkingSection.appendChild(areaDiv);

                parkit.set(area.number, areaData);

                parkingCounter = Math.max(parkingCounter, area.number + 1);
            });

            map.setView(
                [planData.map.center.lat, planData.map.center.lng],
                planData.map.zoom
            );

            if (typeof map.setBearing === "function") {
                map.setBearing(planData.map.bearing || 0);
            }

            console.log("Suunnitelma tuotu:", planData);

            alert("Suunnitelma ladattu onnistuneesti!");

        } catch (error) {
            console.error("Virhe suunnitelmaa lataaessa:", error);
            alert("Suunnitelmaa ei voitu ladata. Tiedosto saattaa olla virheellinen.");
        }

        lataaInput.value = "";
    };

    reader.onerror = function () {
        alert("Suunnitelmaa ei voitu ladata. Tiedosto saattaa olla virheellinen.");
        lataaInput.value = "";
    };

    reader.readAsText(file);
});