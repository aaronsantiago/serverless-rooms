var serverlessRooms = {};

{

serverlessRooms.joinRoom = function(name) {


	let callbacks = {};
	let connections = [];
	let currentlyHost = false;

	var peer = new Peer(name);

	let connectionDataCallback = function(data, conn) {
			console.log(data);
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
		};
	let peerConnectionCallback = function(conn) {
			connections.push(conn);
			// Receive messages
			conn.on('data', (d) => connectionDataCallback(d,conn));
			conn.on("close", () => {console.log("connection closed!!")});
		};

	let reportStatus = function(status) {
		if ("status" in callbacks) {
			for (let cb of callbacks["status"]) {
				cb(status);
			}
		}
	}


	peer.on('error', function(e){
		peer = new Peer();
		peer.on('open', function(id) {
			reportStatus("connected");
			var conn = peer.connect(name);
			connections.push(conn);
			conn.on("open", () => {
				conn.on("data", connectionDataCallback);
			});
			conn.on("close", () => {console.log("connection closed!!")});
		});
		// peer.on("connection", peerConnectionCallback)
	});

	peer.on('open', function(id) {
		currentlyHost = true;
		reportStatus("host");
	});
	peer.on("connection", peerConnectionCallback)

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
