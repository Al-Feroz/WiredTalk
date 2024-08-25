import { io, Socket } from "socket.io-client";

const socket: Socket = io(process.env.NEXT_PUBLIC_SERVER_PATH as string, {
    autoConnect: false,
    reconnection: true,
    transports: ['websocket']
});

export default socket;