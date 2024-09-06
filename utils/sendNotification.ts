import axios from "axios";

const sendNotification = async (notificationData: notification) => {
  await axios
    .post(`${process.env.NEXT_PUBLIC_SERVER_PATH}/api/sendNotification`, {
      ...notificationData,
    });
};

export default sendNotification;