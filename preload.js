const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("planStorage", {

    savePlan: function (name, data) {
        return ipcRenderer.invoke("save-plan", name, data);
    },

    loadPlan: function (name) {
        return ipcRenderer.invoke("load-plan", name);
    },

    listPlans: function () {
        return ipcRenderer.invoke("list-plans");
    },

    deletePlan: function (name) {
        return ipcRenderer.invoke("delete-plan", name);
    },

    // Vastaanottaa Electronilta ohjelman sulkemispyynnön
    onPrepareClose: function (callback) {
        ipcRenderer.on("prepare-close", callback);
    },

    // Ilmoittaa Electronille, että tallennukset on viimeistelty
    confirmClose: function () {
        return ipcRenderer.invoke("confirm-close");
    },

    // Ilmoittaa, jos tallennuksen viimeistely epäonnistuu
    cancelClose: function () {
        return ipcRenderer.invoke("cancel-close");
    },

    publishPlan: function (name) {
    return ipcRenderer.invoke("publish-plan", name);
    },
});