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

                createKoju(
                    koju.number,
                    koju.name,
                    position
                );

                kojumäärä = Math.max(
                    kojumäärä,
                    koju.number + 1
                );

            });

            // Recreate parking areas using the shared creation function
            planData.parkit.forEach(function (area) {

                const corners = area.coordinates.map(function (corner) {
                    return L.latLng(corner.lat, corner.lng);
                });

                luoparkki(
                    area.number,
                    area.name,
                    area.entrance,
                    area.exit,
                    null,
                    corners
                );

                // Keep the next parking number unique
                parkingCounter = Math.max(
                    parkingCounter,
                    area.number + 1
                );

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