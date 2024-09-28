const WebSocket = require("ws");
const http = require("http");

// Create an HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket Server is running");
});

// WebSocket server for '/default'
const wssClient = new WebSocket.Server({ noServer: true });

// WebSocket server for '/control'
const wssControl = new WebSocket.Server({ noServer: true });

// Store all connected clients for /default
const defaultClients = new Set();

// Handle WebSocket connections for '/default'
wssClient.on("connection", (ws) => {
  console.log("Client connected to /default");
  defaultClients.add(ws);

  ws.on("message", (message) => {
    console.log("Received from /default:", message);
    ws.send(`Echo from /default: ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected from /default");
    defaultClients.delete(ws);
  });
});

// Handle WebSocket connections for '/control'
wssControl.on("connection", (ws) => {
  console.log("Client connected to /control");
  ws.send("connected client : " + wssClient.clients.size + " clients");
  ws.on("message", (message) => {
    console.log("Received from /control:", message);

    // Forward the control message to all clients connected to /default
    defaultClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Control message: ${message}`);
      }
    });

    // Respond to the control client
    ws.send(`Command sent: ${message}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected from /control");
  });
});

// Handle upgrade requests to decide which WebSocket server to use
server.on("upgrade", (request, socket, head) => {
  const { url } = request;

  if (url === "/client") {
    wssClient.handleUpgrade(request, socket, head, (ws) => {
      wssClient.emit("connection", ws, request);
    });
  } else if (url === "/control") {
    wssControl.handleUpgrade(request, socket, head, (ws) => {
      wssControl.emit("connection", ws, request);
    });
  } else {
    // If the endpoint doesn't match, destroy the connection
    socket.destroy();
  }
});

// Start the HTTP server
server.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
