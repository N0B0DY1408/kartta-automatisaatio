//itse kartan tuonti ja sitten mihin kartta oletukuksena keskittyy
var map = L.map('map', {rotate: true, bearing: 135}).setView([63.524705, 24.666208], 17); 

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

//tehdään kartalle markkerereita joita käyttäjä voi lisätä klikkaamalla karttaa
const markersSection = document.getElementById("markers");

let kojumäärä = 1;

const kojut = new Map();

map.on('click', function (event){
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