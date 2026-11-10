const kytkin = document.getElementById('switch');

const paneeli = document.getElementById('sivupaneeli');

kytkin.addEventListener('click', function handleSwitchClick() {
    if (kytkin.querySelector('input').checked) {
        paneeli.style.display = 'none';

        document.getElementsByClassName('mapdiv')[0].style.width = '100%';
    } else {
        paneeli.style.display = 'block';
        document.getElementsByClassName('mapdiv')[0].style.width = '1550px';
    }
});