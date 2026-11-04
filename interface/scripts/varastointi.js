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
                database.createObjectStore(
                    "Suunnitelmat",
                    { keyPath: "id" }
                );
            }
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function () {
            databasePromise = null;
            reject(request.error);
        };
    });

    return databasePromise;
}


// Save a named plan
async function savePlan(planId, planData) {

    const database = await openDatabase();

    return new Promise(function (resolve, reject) {

        const transaction = database.transaction(
            "Suunnitelmat",
            "readwrite"
        );

        const store = transaction.objectStore("Suunnitelmat");

        store.put({
            id: planId,
            name: planData.name,
            data: planData,
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


// Load a specific plan
async function loadPlan(planId) {

    const database = await openDatabase();

    return new Promise(function (resolve, reject) {

        const transaction = database.transaction(
            "Suunnitelmat",
            "readonly"
        );

        const store = transaction.objectStore("Suunnitelmat");
        const request = store.get(planId);

        request.onsuccess = function () {
            resolve(request.result ? request.result.data : null);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


// Get all saved plans
async function getAllPlans() {

    const database = await openDatabase();

    return new Promise(function (resolve, reject) {

        const transaction = database.transaction(
            "Suunnitelmat",
            "readonly"
        );

        const store = transaction.objectStore("Suunnitelmat");
        const request = store.getAll();

        request.onsuccess = function () {
            resolve(request.result);
        };

        request.onerror = function () {
            reject(request.error);
        };
    });
}


// Delete a specific plan
async function deletePlan(planId) {

    const database = await openDatabase();

    return new Promise(function (resolve, reject) {

        const transaction = database.transaction(
            "Suunnitelmat",
            "readwrite"
        );

        const store = transaction.objectStore("Suunnitelmat");

        store.delete(planId);

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


// Temporary compatibility functions
async function saveCurrentPlan(planData) {
    return savePlan("current", planData);
}

async function loadCurrentPlan() {
    return loadPlan("current");
}
