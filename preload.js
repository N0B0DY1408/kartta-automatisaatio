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
    }
});