self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || "No data available",
    // icon: data.icon || "/default-icon.png",
    // badge: data.badge || "/default-badge.png",
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "New Notification",
      options
    )
  );
});
