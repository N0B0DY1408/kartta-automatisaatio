const databaseName = "suunnitelmaDB";
const databaseVersion = 1;

let databasePromise = null;


function openDatabase() {

    if (databasePromise) {
        return databasePromise;
    }

    databasePromise = new Promise(function (resolve, reject) {

        const request = indexedDB.open(databaseName, databaseVersion);

        request.onupgradeneeded = function (event) {

            const database = event.target.result;

            if (!database.objectStoreNames.contains("Suunnitelmat")) {
                database.createObjectStore("Suunnitelmat", { keyPath: "id" });
            }
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });

    return databasePromise;
}

async function saveCurrentPlan(suunnitelmaData) {

    const database = await openDatabase();

    return new Promise(function (resolve, reject) {

        const transaction = database.transaction("Suunnitelmat", "readwrite");
        const store = transaction.objectStore("Suunnitelmat");

        store.put({
            id: "current",
            data: suunnitelmaData,
            savedAt: new Date().toISOString()
        });

        transaction.oncomplete = function () {
            resolve();
        };

        transaction.onerror = function () {
            reject(transaction.error);
        };

        transaction.onabort = function () {
            reject(transaction.error);
        };
    });
}


async function loadCurrentPlan() {

    const database = await openDatabase();

    return new Promise(function (resolve, reject) {

        const transaction = database.transaction("Suunnitelmat", "readonly");
        const store = transaction.objectStore("Suunnitelmat");

        const request = store.get("current");

        request.onsuccess = function () {

            if (request.result) {
                resolve(request.result.data);
            } else {
                resolve(null);
            }
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}