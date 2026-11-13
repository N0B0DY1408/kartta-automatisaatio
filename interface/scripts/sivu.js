const kytkin = document.getElementById('switch');

const paneeli = document.getElementById('sivupaneeli');

kytkin.addEventListener('click', function handleSwitchClick() {
    if (kytkin.querySelector('input').checked) {
        paneeli.style.display = 'none';

        document.getElementsByClassName('mapdiv')[0].style.width = '100%';
    } else {
        paneeli.style.display = 'flex';
        document.getElementsByClassName('mapdiv')[0].style.width = '1550px';
    }
});

const searchInput = document.getElementById("haku");

searchInput.addEventListener("input", function () {

    const searchValue = this.value.toLowerCase().trim();
    const joo = document.querySelectorAll(".koju");

    joo.forEach(joo => {
        const number = joo.querySelector("p").textContent.toLowerCase();
        const title = joo.querySelector("h3").textContent.toLowerCase();

        const searchText = number + " " + title;

        if (searchText.includes(searchValue)) {
            joo.style.display = "";
        } else {
            joo.style.display = "none";
        }
    });
});