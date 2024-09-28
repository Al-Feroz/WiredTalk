import axios from "axios";

const sendNotification = async (notificationData: notification) => {
  try {
    await axios.post(
      `${process.env.NEXT_PUBLIC_SERVER_PATH}/api/sendNotification`,
      {
        ...notificationData,
      }
    );
  } catch (err) {
    console.log(err);
  }
};

export default sendNotification;
