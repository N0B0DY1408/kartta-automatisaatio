function laskeKojupaikanKulmat(
    keskipiste,
    leveys = 3,
    korkeus = 3,
    omaRotaatiokulma = 0
    ) {

    // Muutetaan keskipiste kartan koordinaateiksi.
    const keskipisteXY = map.options.crs.project(keskipiste);

    // Yhdistetään kartan rotaatio ja kojupaikan oma rotaatio.
    const rotaatio =
        (-map.getBearing() + omaRotaatiokulma) *
        Math.PI / 180;

    // Suorakulmion suuntavektorit.
    const korkeusX = Math.sin(rotaatio);
    const korkeusY = Math.cos(rotaatio);

    const leveysX = Math.cos(rotaatio);
    const leveysY = -Math.sin(rotaatio);

    // Mercator-koordinaatiston mittakaavakorjaus.
    const mittakaavakerroin = 1 / Math.cos(
        keskipiste.lat * Math.PI / 180
    );

    const puolikasLeveys =
        (leveys * mittakaavakerroin) / 2;

    const puolikasKorkeus =
        (korkeus * mittakaavakerroin) / 2;

    // Lasketaan neljä kulmapistettä.
    const kulmat = [
        [-1, -1],
        [-1, 1],
        [1, 1],
        [1, -1]
    ].map(function ([k, l]) {

        const x =
            keskipisteXY.x +
            k * korkeusX * puolikasKorkeus +
            l * leveysX * puolikasLeveys;

        const y =
            keskipisteXY.y +
            k * korkeusY * puolikasKorkeus +
            l * leveysY * puolikasLeveys;

        return map.options.crs.unproject(
            L.point(x, y)
        );
    });

    return kulmat;
}

function laskeKojupaikanSivukahvat(paikkaData) {

    const keskipisteXY = map.options.crs.project(
        paikkaData.center
    );

    const rotaatio = (
        -map.getBearing() + paikkaData.rotation
    ) * Math.PI / 180;

    const korkeusX = Math.sin(rotaatio);
    const korkeusY = Math.cos(rotaatio);

    const leveysX = Math.cos(rotaatio);
    const leveysY = -Math.sin(rotaatio);

    const mittakaavakerroin = 1 / Math.cos(
        paikkaData.center.lat * Math.PI / 180
    );

    const puolikasLeveys =
        paikkaData.width * mittakaavakerroin / 2;

    const puolikasKorkeus =
        paikkaData.height * mittakaavakerroin / 2;

    function luoPiste(k, l) {

        const x =
            keskipisteXY.x +
            k * korkeusX * puolikasKorkeus +
            l * leveysX * puolikasLeveys;

        const y =
            keskipisteXY.y +
            k * korkeusY * puolikasKorkeus +
            l * leveysY * puolikasLeveys;

        return map.options.crs.unproject(L.point(x, y));
    }

    return {
        yla: luoPiste(0, 1),
        ala: luoPiste(0, -1),
        vasen: luoPiste(-1, 0),
        oikea: luoPiste(1, 0)
    };
}

const kojupaikanKokokahvat = new Map();


function luoKojupaikanKokokahvat(paikkaData) {

    const sivupisteet = laskeKojupaikanSivukahvat(paikkaData);

    const kahvat = {};

    Object.entries(sivupisteet).forEach(function ([sivu, koordinaatti]) {

        const kahva = L.marker(koordinaatti, {
            draggable: true,
            interactive: true,
            icon: L.divIcon({
                className: "kojupaikan-kokokahva",
                html: `
                    <div style="
                        width: 12px;
                        height: 12px;
                        background: white;
                        border: 2px solid #3388ff;
                        border-radius: 50%;
                        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                    "></div>
                `,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        });

        kahvat[sivu] = kahva;

        kahva.on("dragstart", function () {

            kahva.alkuperainenCenter = L.latLng(
                paikkaData.center.lat,
                paikkaData.center.lng
            );

            kahva.alkuperainenLatLng = kahva.getLatLng();

            kahva.alkuperainenWidth = paikkaData.width;
            kahva.alkuperainenHeight = paikkaData.height;
            kahva.alkuperainenRotation = paikkaData.rotation;
        });

        kahva.on("drag", function () {

            const keskipisteXY = map.options.crs.project(
                kahva.alkuperainenCenter
            );

            const alkuperainenKahvaXY = map.options.crs.project(
                kahva.alkuperainenLatLng
            );

            const nykyinenKahvaXY = map.options.crs.project(
                kahva.getLatLng()
            );

            const rotaatio = (
                -map.getBearing() + kahva.alkuperainenRotation
            ) * Math.PI / 180;

            const korkeusX = Math.sin(rotaatio);
            const korkeusY = Math.cos(rotaatio);

            const leveysX = Math.cos(rotaatio);
            const leveysY = -Math.sin(rotaatio);

            let suuntaX;
            let suuntaY;

            if (sivu === "yla") {
                suuntaX = leveysX;
                suuntaY = leveysY;
            } else if (sivu === "ala") {
                suuntaX = -leveysX;
                suuntaY = -leveysY;
            } else if (sivu === "vasen") {
                suuntaX = -korkeusX;
                suuntaY = -korkeusY;
            } else {
                suuntaX = korkeusX;
                suuntaY = korkeusY;
            }

            const deltaX = nykyinenKahvaXY.x - alkuperainenKahvaXY.x;
            const deltaY = nykyinenKahvaXY.y - alkuperainenKahvaXY.y;

            const mittakaavakerroin = 1 / Math.cos(
                kahva.alkuperainenCenter.lat * Math.PI / 180
            );

            const siirtyma = (
                deltaX * suuntaX + deltaY * suuntaY
            ) / mittakaavakerroin;

            const onLeveys = sivu === "yla" || sivu === "ala";

            const alkuperainenMitta = onLeveys
                ? kahva.alkuperainenWidth
                : kahva.alkuperainenHeight;

            // Pyöristetään mitta lähimpään 0,5 metriin.
            const uusiMitta = Math.max(
                0.5,
                Math.round(
                    (alkuperainenMitta + siirtyma) / 0.5
                ) * 0.5
            );

            const todellinenSiirtyma = uusiMitta - alkuperainenMitta;

            const uusiKeskipisteXY = L.point(
                keskipisteXY.x + suuntaX * todellinenSiirtyma * mittakaavakerroin / 2,
                keskipisteXY.y + suuntaY * todellinenSiirtyma * mittakaavakerroin / 2
            );

            paikkaData.center = map.options.crs.unproject(
                uusiKeskipisteXY
            );

            if (onLeveys) {
                paikkaData.width = uusiMitta;
            } else {
                paikkaData.height = uusiMitta;
            }

            const uudetKulmat = laskeKojupaikanKulmat(
                paikkaData.center,
                paikkaData.width,
                paikkaData.height,
                paikkaData.rotation
            );

            paikkaData.layer.setLatLngs(uudetKulmat);
            paikkaData.coordinates = uudetKulmat;

            muokkausKojuLeveys.value = paikkaData.width.toFixed(2);
            muokkausKojuKorkeus.value = paikkaData.height.toFixed(2);
        });

        kahva.on("dragend", function () {

            const uudetSivupisteet = laskeKojupaikanSivukahvat(
                paikkaData
            );

            Object.entries(kahvat).forEach(function ([nimi, toinenKahva]) {
                toinenKahva.setLatLng(uudetSivupisteet[nimi]);
            });

            scheduleAutosave();
        });
    });

    kojupaikanKokokahvat.set(paikkaData.number, kahvat);

    return kahvat;
}
