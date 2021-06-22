var serverlessRooms = {};

{

serverlessRooms.joinRoom = function(name) {

	let callbacks = {};
	let connections = [];
	let currentlyHost = false;

	let connectionDataCallback = function(data, conn) {
			console.log(data);
			if (data == "ping") {
				conn.lastPing = Date.now();
				setTimeout(() => {conn.send("ping")}, 200);
			}
			else {
				if ("message" in callbacks) {
					for (let cb of callbacks["message"]) {
						cb(data);
					}
				}
				if (currentlyHost) {
					for (let connection of connections) {
						if (connection === conn) continue;
						connection.send(data);
					}
				}
			}
		};

	let setupConnectionHeartbeatCheck = function(conn) {
			conn.lastPing = Date.now();
			let heartbeatCheckFunction = function() {
				if (Date.now() - conn.lastPing > 2000) {
					var newHostPeer = new Peer(name);

					newHostPeer.on('error', function(e){
						if (e.type == "unavailable-id") {
							conn.close();
							setupListenerConnection();
						}
						else {
							console.log(e);
							// peer.on("connection", peerConnectionCallback)
						}
					});

					newHostPeer.on('open', function(id) {
						currentlyHost = true;
						reportStatus("host");
						peer.destroy();
						connections = [];
						peer = newHostPeer;
						peer.on("connection", peerConnectionCallback);
					});
				}
				else {
					setTimeout(heartbeatCheckFunction, 200);
				}
			}
			conn.send("ping");
			heartbeatCheckFunction();
		}
	let peerConnectionCallback = function(conn) {
			connections.push(conn);

			// Receive messages
			conn.on('data', (d) => connectionDataCallback(d,conn));
			conn.on("close", () => {console.log("connection closed!!")});
			conn.on("error", (e) => {console.log("connection error"); console.log(e);})
		};

	let reportStatus = function(status) {
			if ("status" in callbacks) {
				for (let cb of callbacks["status"]) {
					cb(status);
				}
			}
		}

	let setupListenerConnection = function() {
			reportStatus("connectingToHost");
			var conn = peer.connect(name);
			connections.push(conn);
			conn.on("open", () => {
				reportStatus("connected");
				conn.on("data", (d) => connectionDataCallback(d, conn));
				setupConnectionHeartbeatCheck(conn);
			});
			conn.on("close", () => {console.log("connection closed!!")});
		}


	var peer = new Peer(name);

	peer.on('error', function(e){
		if (e.type == "unavailable-id") {
			peer = new Peer();
			peer.on('open', setupListenerConnection);
		}
		else {
			console.log(e);
			// peer.on("connection", peerConnectionCallback)
		}
	});

	peer.on('open', function(id) {
		currentlyHost = true;
		reportStatus("host");
	});
	peer.on("connection", peerConnectionCallback);

	var serverlessRoomConnection = {
		on: (type, func) => {
			if (!(type in callbacks)) {
				callbacks[type] = [func];
			}
			else {
				callbacks[type].push(func);
			}
		},
		message: (message) => {
			for (let connection of connections) {
				connection.send(message);
			}
		},
		close: () => {
			peer.destroy();
		}

	}
	return serverlessRoomConnection;
}

}
