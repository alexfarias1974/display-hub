async function loadFilterOptions() {
  try {
    const [devices, folders] = await Promise.all([
      api.getDevices({limit: 1000}),
      api.getDeviceFolders({limit: 1000})
    ]);
    console.log("Devices loaded:", devices);
    console.log("Folders loaded:", folders);
  } catch(e) {
    console.error("Failed loading filters", e);
  }
}
