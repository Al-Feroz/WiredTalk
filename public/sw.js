var pushUrl = "/";

self.addEventListener("push", (event) => {
  const data = event.data.json();
  const options = {
    body: data.body || "No data available",
    icon: data.icon || "/user.png",
    badge: data.badge || "/user.png",
  };

  pushUrl = data.type === "one-to-one-call" ? data.body : "/";

  event.waitUntil(
    self.registration.showNotification(
      data.title || "New Notification",
      options
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(pushUrl));
});
