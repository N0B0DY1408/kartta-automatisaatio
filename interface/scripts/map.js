var map = L.map('map', {rotate: true, bearing: 135}).setView([63.524705, 24.666208], 17); 

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

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
    popuptitle.textcontent = `koju #${kojunumero}`;

    const popupname = document.createElement("p");
    popupname.textcontent = Kojunimi.trim();

    popupcontent.append(popuptitle, popupname);

    marker.bindPopup(popupcontent);


});

