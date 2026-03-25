// =============================================================================
// Socket.io client for ACP backend connection.
// =============================================================================

import { io, type Socket } from "socket.io-client";
import { SocketEvent, type AcpJobEventData } from "./types.js";

export interface AcpSocketCallbacks {
  onNewTask: (job: AcpJobEventData, ack?: () => void) => void;
  onEvaluate?: (job: AcpJobEventData, ack?: () => void) => void;
}

export interface AcpSocketOptions {
  acpUrl: string;
  walletAddress: string;
  callbacks: AcpSocketCallbacks;
}

export function connectAcpSocket(options: AcpSocketOptions): () => void {
  const { acpUrl, walletAddress, callbacks } = options;

  const socket: Socket = io(acpUrl, {
    auth: { walletAddress },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log(`[acp-socket] Connected to ${acpUrl}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[acp-socket] Disconnected: ${reason}`);
  });

  socket.on("connect_error", (err) => {
    console.error(`[acp-socket] Connection error: ${err.message}`);
  });

  socket.on(SocketEvent.ROOM_JOINED, (data: any) => {
    console.log(`[acp-socket] Room joined: ${JSON.stringify(data)}`);
  });

  socket.on(SocketEvent.ON_NEW_TASK, (data: AcpJobEventData, ack?: () => void) => {
    console.log(`[acp-socket] New task: job=${data.id} phase=${data.phase}`);
    callbacks.onNewTask(data, ack);
    if (typeof ack === "function") ack();
  });

  socket.on(SocketEvent.ON_EVALUATE, (data: AcpJobEventData, ack?: () => void) => {
    if (callbacks.onEvaluate) {
      callbacks.onEvaluate(data, ack);
    }
    if (typeof ack === "function") ack();
  });

  // Cleanup function
  const cleanup = () => {
    console.log("[acp-socket] Disconnecting...");
    socket.disconnect();
  };

  // Handle process signals for graceful shutdown
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  return cleanup;
}
